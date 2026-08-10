import { useCallback, useEffect, useRef } from "react";
import { wsService } from "@/services/websocketService";

/** How long a typing indicator stays "on" without new keystrokes. */
const TYPING_TIMEOUT_MS = 3000;

/**
 * Manages the outbound typing indicator for one conversation.
 *
 * - Sends `typing: true` immediately on the first keystroke.
 * - Auto-sends `typing: false` after TYPING_TIMEOUT_MS of inactivity.
 * - Sends `typing: false` when stopTyping() is called (e.g. message sent).
 * - Stops and clears all timers when the socket disconnects or the hook unmounts.
 */
export function useTyping(roomId?: string, receiverId?: string) {
  const roomIdRef = useRef(roomId);
  const receiverIdRef = useRef(receiverId);
  const typingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the destination current without invalidating the timer closures.
  useEffect(() => {
    roomIdRef.current = roomId;
    receiverIdRef.current = receiverId;
  }, [roomId, receiverId]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Publish typing:false and reset state (used by the idle timeout and stopTyping). */
  const stopNow = useCallback(() => {
    if (!typingRef.current) return;
    typingRef.current = false;
    clearTimer();
    wsService.sendTyping(roomIdRef.current, receiverIdRef.current, false);
  }, [clearTimer]);

  const send = useCallback(
    (typing: boolean) => {
      if (typingRef.current === typing) return; // no-op if state unchanged
      typingRef.current = typing;
      wsService.sendTyping(roomIdRef.current, receiverIdRef.current, typing);
      if (typing) {
        clearTimer();
        timerRef.current = setTimeout(stopNow, TYPING_TIMEOUT_MS);
      } else {
        clearTimer();
      }
    },
    [clearTimer, stopNow]
  );

  /** Call on every keystroke. Starts immediately; resets the auto-stop timer. */
  const markTyping = useCallback(() => {
    if (!wsService.isConnected) return;
    if (typingRef.current) {
      clearTimer();
      timerRef.current = setTimeout(stopNow, TYPING_TIMEOUT_MS);
    } else {
      send(true);
    }
  }, [send, clearTimer, stopNow]);

  /** Call when the message is sent (or the input is abandoned). */
  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      stopNow();
    } else {
      clearTimer();
    }
  }, [stopNow, clearTimer]);

  // Cleanup: on socket disconnect, drop the claimed typing state and timers;
  // on unmount, tell peers we stopped typing and clear timers (no leaks).
  useEffect(() => {
    const unsub = wsService.onConnection((connected) => {
      if (!connected && typingRef.current) {
        typingRef.current = false;
        clearTimer();
      }
    });
    return () => {
      unsub();
      if (typingRef.current) {
        typingRef.current = false;
        wsService.sendTyping(roomIdRef.current, receiverIdRef.current, false);
      }
      clearTimer();
    };
  }, [clearTimer]);

  return { markTyping, stopTyping };
}
