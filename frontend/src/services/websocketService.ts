// WebSocket service for real-time messaging and notifications
// Uses native WebSocket with SockJS-compatible fallback

type MessageCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private notificationCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<MessageCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private userId: string | null = null;
  private token: string | null = null;

  connect(userId: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.userId = userId;
    this.token = token;
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WS] Connected");
        this.reconnectAttempts = 0;

        // Send auth message
        this.send({ type: "auth", token, userId });

        // Subscribe to user-specific channel
        this.send({ type: "subscribe", channel: `/user/${userId}` });

        // Start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          console.warn("[WS] Failed to parse message");
        }
      };

      this.ws.onclose = () => {
        console.log("[WS] Disconnected");
        this.handleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[WS] Error:", err);
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      this.handleReconnect();
    }
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Room messages
  onRoomMessage(roomId: string, callback: MessageCallback) {
    if (!this.messageCallbacks.has(roomId)) {
      this.messageCallbacks.set(roomId, new Set());
    }
    this.messageCallbacks.get(roomId)!.add(callback);

    // Subscribe to room channel
    this.send({ type: "subscribe", channel: `/room/${roomId}` });

    return () => {
      this.messageCallbacks.get(roomId)?.delete(callback);
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
    this.send({ type: "typing", roomId, receiverId, userId: this.userId, typing });
  }

  sendMessage(data: { roomId?: string; receiverId?: string; content: string; messageType?: string; systemMessage?: boolean }) {
    this.send({
      type: "message",
      ...data,
      senderId: this.userId,
    });
  }

  private handleMessage(data: any) {
    // Route messages
    if (data.type === "message") {
      const roomId = data.roomId;
      if (roomId && this.messageCallbacks.has(roomId)) {
        this.messageCallbacks.get(roomId)!.forEach((cb) => cb(data));
      } else if (data.receiverId || data.senderId) {
        // DM — notify all DM callbacks
        this.messageCallbacks.forEach((callbacks, key) => {
          if (key.startsWith("dm_")) callbacks.forEach((cb) => cb(data));
        });
      }
    }

    if (data.type === "notification") {
      this.notificationCallbacks.forEach((cb) => cb(data));
    }

    if (data.type === "typing") {
      this.typingCallbacks.forEach((cb) => cb(data));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      if (this.userId && this.token) {
        this.connect(this.userId, this.token);
      }
    }, delay);
  }

  private heartbeatInterval: any = null;

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const wsService = new WebSocketService();
