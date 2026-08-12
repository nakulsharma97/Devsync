package com.devsync.message.entity;

/**
 * Lifecycle of a chat message.
 * <ul>
 *   <li>{@code SENT} — persisted; not yet delivered to the transport.</li>
 *   <li>{@code DELIVERED} — pushed over the real-time transport.</li>
 *   <li>{@code READ} — the recipient opened the conversation. For rooms, the
 *       per-user read state lives in {@code message_reads}; the per-message
 *       status stays {@code DELIVERED}.</li>
 * </ul>
 */
public enum MessageStatus {
    SENT, DELIVERED, READ
}
