// STOMP over native WebSocket for real-time messaging
// Handles connection lifecycle, pending subscriptions, and auto-resubscribe on reconnect

import { Client, type IMessage, type IFrame } from "@stomp/stompjs";
import type { MessageDto } from "./messageService";
import type { NotificationDto } from "./notificationService";

/** Callback for chat messages (room topics + the direct-message queue). */
type MessageCallback = (data: MessageDto) => void;
/** Callback for parsed STOMP frames on generic topics (e.g. shared notes). */
type TopicCallback = (data: unknown) => void;
type NotificationCallback = (data: NotificationDto) => void;
type TypingCallback = (data: TypingEvent) => void;
type PresenceCallback = (data: PresenceEvent) => void;
type ConnectionCallback = (connected: boolean) => void;
/** Global callback fired for every incoming message (for unread badge updates). */
type GlobalMessageCallback = (data: MessageDto) => void;

/** Payload of a /chat.typing indicator. */
interface TypingEvent {
  userId?: string;
  roomId?: string;
  receiverId?: string;
  typing?: boolean;
}

/** Payload of a /topic/presence update. */
interface PresenceEvent {
  userId?: string;
  status?: string;
}

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
  /** Direct-message listeners keyed by peer user id — routed precisely on /user/queue/messages. */
  private directCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  /** Global listeners for any incoming message (used for unread badge updates). */
  private globalMessageCallbacks: Set<GlobalMessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private presenceCallbacks: Set<PresenceCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  /** Generic topic listeners (e.g. project notes) keyed by topic. */
  private topicCallbacks: Map<string, Set<TopicCallback>> = new Map();
  /** Active generic STOMP subscriptions (recreated on reconnect). */
  private activeTopicSubs: Map<string, () => void> = new Map();

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
    // Same-origin by default (/ws, proxied by nginx in prod and by the Vite dev
    // server in dev). Relative URLs use the page's own scheme, so wss is chosen
    // automatically over HTTPS; absolute http(s) URLs are converted to ws(s).
    const rawWsUrl = import.meta.env.VITE_WS_URL || "/ws";
    const wsUrl =
      rawWsUrl.startsWith("/") || rawWsUrl.startsWith("ws")
        ? rawWsUrl
        : rawWsUrl.replace("http", "ws");

    this.client = new Client({
      webSocketFactory: () => new WebSocket(wsUrl),
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

      // Typing indicators for DMs arrive on the per-user queue
      this.safeSubscribe(`/user/queue/typing`, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.handleIncomingTyping(data);
        } catch (e) {
          console.warn("[STOMP] Failed to parse typing indicator:", e);
        }
      });

      // Global presence feed (userId + status)
      this.safeSubscribe(`/topic/presence`, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body) as PresenceEvent;
          this.presenceCallbacks.forEach((cb) => cb(data));
        } catch (e) {
          console.warn("[STOMP] Failed to parse presence update:", e);
        }
      });

      // Process any pending room subscriptions
      this.processPendingSubscriptions();
      // Recreate generic topic subscriptions (notes, etc.)
      this.processPendingTopicSubscriptions();
    };

    this.client.onDisconnect = () => {
      console.log("[STOMP] Disconnected");
      this.connected = false;
      this.connectionCallbacks.forEach((cb) => cb(false));
      // Clear active subscriptions so they get recreated on reconnect
      this.activeSubscriptions.clear();
      this.activeTopicSubs.clear();
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
    // Drop stale message/typing/notification/presence listeners so a session
    // change (e.g. logout) can never keep firing into components of a previous
    // auth context. connectionCallbacks are intentionally kept: they are the
    // status-propagation channel for mounted components (e.g. the Messages
    // "Connecting..." indicator) and every subscriber unsubscribes on unmount.
    this.messageCallbacks.clear();
    this.directCallbacks.clear();
    this.notificationCallbacks.clear();
    this.globalMessageCallbacks.clear();
    this.typingCallbacks.clear();
    this.presenceCallbacks.clear();
    this.topicCallbacks.clear();
    this.activeTopicSubs.clear();
  }

  /** Is the STOMP session currently active? */
  get isConnected(): boolean {
    return this.connected && this.client?.active === true;
  }

  /** The user id this client connected as (null before connect). */
  get currentUserId(): string | null {
    return this.userId;
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
   * Subscribe to direct messages with a specific peer.
   *
   * DM messages arrive on /user/queue/messages for both participants, so this
   * routes them precisely: a message from the peer OR addressed to the peer
   * (the echo of our own send) is delivered to this callback.
   * Returns an unsubscribe function.
   */
  subscribeToDirect(otherUserId: string, callback: MessageCallback): () => void {
    if (!this.directCallbacks.has(otherUserId)) {
      this.directCallbacks.set(otherUserId, new Set());
    }
    this.directCallbacks.get(otherUserId)!.add(callback);
    return () => {
      this.directCallbacks.get(otherUserId)?.delete(callback);
      if (this.directCallbacks.get(otherUserId)?.size === 0) {
        this.directCallbacks.delete(otherUserId);
      }
    };
  }

  /**
   * Ensure STOMP subscriptions exist for the given room (messages + typing).
   * If not connected, they're queued as pending.
   */
  private ensureRoomSubscription(roomId: string, topic: string) {
    if (this.activeSubscriptions.has(roomId)) return; // already subscribed
    if (this.client?.active && this.connected) {
      const messageSub = this.client.subscribe(topic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
        } catch (e) {
          console.warn("[STOMP] Failed to parse room message:", e);
        }
      });
      const typingTopic = `/topic/room/${roomId}/typing`;
      const typingSub = this.client.subscribe(typingTopic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.handleIncomingTyping(data);
        } catch (e) {
          console.warn("[STOMP] Failed to parse room typing indicator:", e);
        }
      });
      this.activeSubscriptions.set(roomId, () => {
        messageSub.unsubscribe();
        typingSub.unsubscribe();
      });
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
        const messageSub = this.client!.subscribe(topic, (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
          } catch (e) {
            console.warn("[STOMP] Failed to parse room message:", e);
          }
        });
        const typingTopic = `/topic/room/${roomId}/typing`;
        const typingSub = this.client!.subscribe(typingTopic, (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.handleIncomingTyping(data);
          } catch (e) {
            console.warn("[STOMP] Failed to parse room typing indicator:", e);
          }
        });
        this.activeSubscriptions.set(roomId, () => {
          messageSub.unsubscribe();
          typingSub.unsubscribe();
        });
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

  // ── Generic topic subscriptions (e.g. shared project notes) ──

  /**
   * Subscribe to an arbitrary topic (e.g. /topic/projects/{id}/notes).
   * Re-subscribes automatically on reconnect. Returns an unsubscribe function.
   */
  subscribeToTopic(topic: string, callback: TopicCallback): () => void {
    if (!this.topicCallbacks.has(topic)) this.topicCallbacks.set(topic, new Set());
    this.topicCallbacks.get(topic)!.add(callback);

    // Create the STOMP subscription when connected.
    if (this.client?.active && this.connected && !this.activeTopicSubs.has(topic)) {
      const sub = this.client.subscribe(topic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.topicCallbacks.get(topic)?.forEach((cb) => cb(data));
        } catch (e) {
          console.warn("[STOMP] Failed to parse topic message:", e);
        }
      });
      this.activeTopicSubs.set(topic, () => sub.unsubscribe());
    }

    return () => {
      this.topicCallbacks.get(topic)?.delete(callback);
      if (this.topicCallbacks.get(topic)?.size === 0) {
        this.activeTopicSubs.get(topic)?.();
        this.activeTopicSubs.delete(topic);
        this.topicCallbacks.delete(topic);
      }
    };
  }

  /** Recreate generic topic subscriptions after a reconnect. */
  private processPendingTopicSubscriptions() {
    if (!this.client?.active || !this.connected) return;
    for (const topic of this.topicCallbacks.keys()) {
      if (this.activeTopicSubs.has(topic)) continue;
      const sub = this.client.subscribe(topic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          this.topicCallbacks.get(topic)?.forEach((cb) => cb(data));
        } catch (e) {
          console.warn("[STOMP] Failed to parse topic message:", e);
        }
      });
      this.activeTopicSubs.set(topic, () => sub.unsubscribe());
    }
  }

  /** Publish a shared-doc update to /app/notes.update (server validates membership). */
  publishNotesUpdate(projectId: string, update: string) {
    this.client?.publish({
      destination: "/app/notes.update",
      body: JSON.stringify({ projectId, update }),
    });
  }

  // ── Notifications ────────────────────────────────────────────

  onNotification(callback: NotificationCallback) {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  /**
   * Subscribe to every incoming message for global state (unread badge).
   * Fires for ALL messages, including echoes of the user's own sends.
   * The caller must filter by senderId !== currentUserId if needed.
   */
  onAnyMessage(callback: GlobalMessageCallback) {
    this.globalMessageCallbacks.add(callback);
    return () => this.globalMessageCallbacks.delete(callback);
  }

  // ── Typing indicators ────────────────────────────────────────

  onTyping(callback: TypingCallback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  /**
   * Route a parsed typing event ({ userId, roomId?, receiverId?, typing }) to
   * every registered listener. Listeners filter by room/conversation.
   */
  private handleIncomingTyping(data: TypingEvent) {
    this.typingCallbacks.forEach((cb) => cb(data));
  }

  // ── Presence ─────────────────────────────────────────────────

  /** Hook into live presence updates ({ userId, status }). */
  onPresence(callback: PresenceCallback) {
    this.presenceCallbacks.add(callback);
    return () => this.presenceCallbacks.delete(callback);
  }

  /** Publish an explicit presence status via the socket. */
  sendPresence(status: string) {
    this.client?.publish({
      destination: "/app/presence",
      body: JSON.stringify({ status }),
    });
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
    attachmentId?: string;
    parentMessageId?: string;
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

  private handleIncomingMessage(data: MessageDto) {
    // Route to room subscribers
    if (data.roomId) {
      const topic = `/topic/room/${data.roomId}`;
      this.messageCallbacks.get(topic)?.forEach((cb) => cb(data));
    }

    // Route to direct-message subscribers for this peer — incoming messages
    // carry the sender's id, echoes of our own sends carry the receiver's id.
    if (!data.roomId) {
      this.directCallbacks.forEach((callbacks, peerId) => {
        if (data.senderId === peerId || data.receiverId === peerId) {
          callbacks.forEach((cb) => cb(data));
        }
      });
    }

    // Notify global listeners (unread badge updates, etc.)
    this.globalMessageCallbacks.forEach((cb) => cb(data));
  }

  private handleIncomingNotification(data: NotificationDto) {
    this.notificationCallbacks.forEach((cb) => cb(data));
  }
}

export const wsService = new WebSocketService();


