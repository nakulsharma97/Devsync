// STOMP over SockJS WebSocket service for real-time messaging
// Matches the Spring Boot backend configuration

import SockJS from "sockjs-client";
import { Client, type IMessage, type IFrame } from "@stomp/stompjs";

type MessageCallback = (data: any) => void;
type ConnectionCallback = (connected: boolean) => void;

class WebSocketService {
  private client: Client | null = null;
  private roomSubscriptions: Map<string, () => void> = new Map();
  private dmSubscriptions: Set<string> = new Set();
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private notificationCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private userId: string | null = null;
  private connected = false;

  connect(userId: string, token: string) {
    if (this.client?.active) return;

    this.userId = userId;
    const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:8080/ws";

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
      },
      debug: (msg) => {
        if (import.meta.env.DEV) console.debug("[STOMP]", msg);
      },
      reconnectDelay: 2000,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = (frame: IFrame) => {
      console.log("[STOMP] Connected");
      this.connected = true;
      this.connectionCallbacks.forEach((cb) => cb(true));

      // Subscribe to user-specific queue for DMs and notifications
      this.client?.subscribe(`/user/queue/messages`, (msg: IMessage) => {
        const data = JSON.parse(msg.body);
        this.handleIncomingMessage(data);
      });

      this.client?.subscribe(`/user/queue/notifications`, (msg: IMessage) => {
        const data = JSON.parse(msg.body);
        this.handleIncomingNotification(data);
      });
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      this.connectionCallbacks.forEach((cb) => cb(false));
    };

    this.client.onStompError = (frame: IFrame) => {
      console.error("[STOMP] Error:", frame.headers["message"]);
      this.connected = false;
    };

    this.client.activate();
  }

  disconnect() {
    this.connected = false;
    this.client?.deactivate();
    this.client = null;
    this.roomSubscriptions.clear();
    this.dmSubscriptions.clear();
  }

  onConnection(callback: ConnectionCallback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  // Room messages
  subscribeToRoom(roomId: string, callback: MessageCallback) {
    const topic = `/topic/room/${roomId}`;
    if (!this.messageCallbacks.has(topic)) {
      this.messageCallbacks.set(topic, new Set());
    }
    this.messageCallbacks.get(topic)!.add(callback);

    if (!this.roomSubscriptions.has(roomId) && this.client?.active) {
      const sub = this.client.subscribe(topic, (msg: IMessage) => {
        const data = JSON.parse(msg.body);
        this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
      });
      this.roomSubscriptions.set(roomId, () => sub.unsubscribe());
    }

    return () => {
      this.messageCallbacks.get(topic)?.delete(callback);
      if (this.messageCallbacks.get(topic)?.size === 0) {
        this.roomSubscriptions.get(roomId)?.();
        this.roomSubscriptions.delete(roomId);
        this.messageCallbacks.delete(topic);
      }
    };
  }

  // Notifications
  onNotification(callback: MessageCallback) {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  // Typing indicators
  onTyping(callback: MessageCallback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  sendTyping(roomId?: string, receiverId?: string, typing = true) {
    this.client?.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ roomId, receiverId, userId: this.userId, typing }),
    });
  }

  sendMessage(data: {
    roomId?: string;
    receiverId?: string;
    content: string;
    messageType?: string;
    systemMessage?: boolean;
  }) {
    this.client?.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        ...data,
        senderId: this.userId,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  get isConnected() {
    return this.connected;
  }

  private handleIncomingMessage(data: any) {
    const topic = data.roomId
      ? `/topic/room/${data.roomId}`
      : "dm";

    this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));

    // Also notify DM listeners
    if (!data.roomId) {
      this.messageCallbacks.forEach((callbacks, key) => {
        if (key.startsWith("dm_")) callbacks.forEach((cb) => cb(data));
      });
    }
  }

  private handleIncomingNotification(data: any) {
    this.notificationCallbacks.forEach((cb) => cb(data));
  }
}

export const wsService = new WebSocketService();
