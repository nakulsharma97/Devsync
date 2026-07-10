// STOMP over SockJS WebSocket service for real-time messaging
// Handles connection lifecycle, pending subscriptions, and auto-resubscribe on reconnect

import SockJS from "sockjs-client";
import { Client, type IMessage, type IFrame } from "@stomp/stompjs";

type MessageCallback = (data: any) => void;
type ConnectionCallback = (connected: boolean) => void;

/** A subscription that hasn't been created yet because the client isn't connected */
interface PendingSubscription {
  topic: string;
  callback: MessageCallback;
  roomId: string;
}

class WebSocketService {
  private client: Client | null = null;
  /** Active STOMP subscriptions keyed by roomId */
  private activeSubscriptions: Map<string, () => void> = new Map();
  /** Active listeners for each topic (may have listeners before STOMP is connected) */
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private notificationCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();

  /** Subscriptions queued while disconnected — auto-processed on connect */
  private pendingSubscriptions: Map<string, PendingSubscription> = new Map();

  private userId: string | null = null;
  private token: string | null = null;
  private connected = false;

  // ── Lifecycle ────────────────────────────────────────────────

  connect(userId: string, token: string) {
    if (this.client?.active) {
      console.log("[STOMP] Already connected");
      return;
    }

    this.userId = userId;
    this.token = token;
    const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:8080/ws";

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
      },
      debug: (msg) => {
        if (import.meta.env.DEV) console.debug("[STOMP]", msg.trim());
      },
      reconnectDelay: 2000,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      console.log("[STOMP] Connected ✓");
      this.connected = true;
      this.connectionCallbacks.forEach((cb) => cb(true));

      // Subscribe to user-specific queues (DMs + notifications)
      this.safeSubscribe(`/user/queue/messages`, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.warn("[STOMP] Failed to parse message:", e);
        }
      });

      this.safeSubscribe(`/user/queue/notifications`, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.handleIncomingNotification(data);
        } catch (e) {
          console.warn("[STOMP] Failed to parse notification:", e);
        }
      });

      // Process any pending room subscriptions
      this.processPendingSubscriptions();
    };

    this.client.onDisconnect = () => {
      console.log("[STOMP] Disconnected");
      this.connected = false;
      this.connectionCallbacks.forEach((cb) => cb(false));
      // Clear active subscriptions so they get recreated on reconnect
      this.activeSubscriptions.clear();
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
    this.activeSubscriptions.clear();
    this.pendingSubscriptions.clear();
  }

  /** Is the STOMP session currently active? */
  get isConnected(): boolean {
    return this.connected && this.client?.active === true;
  }

  /** Hook into connection state changes */
  onConnection(callback: ConnectionCallback) {
    this.connectionCallbacks.add(callback);
    // Fire immediately if already connected
    if (this.connected && this.client?.active) callback(true);
    return () => this.connectionCallbacks.delete(callback);
  }

  // ── Subscriptions ────────────────────────────────────────────

  /**
   * Subscribe to a room's message topic.
   * If the client isn't connected yet, the subscription is queued
   * and auto-created when the connection is established.
   * Returns an unsubscribe function.
   */
  subscribeToRoom(roomId: string, callback: MessageCallback): () => void {
    const topic = `/topic/room/${roomId}`;

    // Register the callback
    if (!this.messageCallbacks.has(topic)) {
      this.messageCallbacks.set(topic, new Set());
    }
    this.messageCallbacks.get(topic)!.add(callback);

    // Create STOMP subscription if connected
    this.ensureRoomSubscription(roomId, topic);

    return () => {
      this.messageCallbacks.get(topic)?.delete(callback);
      // Clean up if no more listeners
      if (this.messageCallbacks.get(topic)?.size === 0) {
        this.activeSubscriptions.get(roomId)?.();
        this.activeSubscriptions.delete(roomId);
        this.pendingSubscriptions.delete(roomId);
        this.messageCallbacks.delete(topic);
      }
    };
  }

  /**
   * Ensure a STOMP subscription exists for the given room.
   * If not connected, it's queued as pending.
   */
  private ensureRoomSubscription(roomId: string, topic: string) {
    if (this.activeSubscriptions.has(roomId)) return; // already subscribed
    if (this.client?.active && this.connected) {
      const sub = this.client.subscribe(topic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
        } catch (e) {
          console.warn("[STOMP] Failed to parse room message:", e);
        }
      });
      this.activeSubscriptions.set(roomId, () => sub.unsubscribe());
      this.pendingSubscriptions.delete(roomId);
    } else {
      // Queue for later
      this.pendingSubscriptions.set(roomId, { topic, callback: () => {}, roomId });
    }
  }

  /** Process all subscriptions that were queued while disconnected */
  private processPendingSubscriptions() {
    if (!this.client?.active || !this.connected) return;
    this.pendingSubscriptions.forEach((pending, roomId) => {
      const topic = pending.topic;
      if (!this.activeSubscriptions.has(roomId)) {
        const sub = this.client!.subscribe(topic, (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
          } catch (e) {
            console.warn("[STOMP] Failed to parse room message:", e);
          }
        });
        this.activeSubscriptions.set(roomId, () => sub.unsubscribe());
      }
    });
    this.pendingSubscriptions.clear();
  }

  /** Subscribe to a topic and manage lifecycle automatically */
  private safeSubscribe(topic: string, callback: (msg: IMessage) => void) {
    if (this.client?.active) {
      this.client.subscribe(topic, callback);
    }
  }

  // ── Notifications ────────────────────────────────────────────

  onNotification(callback: MessageCallback) {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  // ── Typing indicators ────────────────────────────────────────

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

  // ── Send message ─────────────────────────────────────────────

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

  // ── Incoming message routing ─────────────────────────────────

  private handleIncomingMessage(data: any) {
    // Route to room subscribers
    if (data.roomId) {
      const topic = `/topic/room/${data.roomId}`;
      this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
    }

    // Route to DM subscribers (stored under "dm" key or any topic)
    if (!data.roomId) {
      // Notify all listeners who care about DMs
      this.messageCallbacks.forEach((callbacks) => {
        callbacks.forEach((cb) => cb(data));
      });
    }
  }

  private handleIncomingNotification(data: any) {
    this.notificationCallbacks.forEach((cb) => cb(data));
  }
}

export const wsService = new WebSocketService();
