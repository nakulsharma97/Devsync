import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTyping } from "./useTyping";
import { wsService } from "@/services/websocketService";

vi.mock("@/services/websocketService", () => ({
  wsService: {
    isConnected: true,
    sendTyping: vi.fn(),
    onConnection: vi.fn(() => () => true),
  },
}));

describe("useTyping", () => {
  const sendTyping = vi.mocked(wsService.sendTyping);
  const onConnection = vi.mocked(wsService.onConnection);

  beforeEach(() => {
    vi.useFakeTimers();
    sendTyping.mockClear();
    onConnection.mockClear();
    onConnection.mockImplementation(() => () => true);
    Object.defineProperty(wsService, "isConnected", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends typing:true immediately on the first keystroke", () => {
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledWith("room-1", undefined, true);
  });

  it("does not re-send while already typing (dedupe)", () => {
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    act(() => result.current.markTyping());
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledTimes(1);
  });

  it("auto-sends typing:false after the idle timeout", () => {
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledWith("room-1", undefined, true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(sendTyping).toHaveBeenCalledWith("room-1", undefined, false);
    expect(sendTyping).toHaveBeenCalledTimes(2);
  });

  it("keeps typing alive on continued keystrokes (timer resets)", () => {
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.markTyping()); // reset the idle timer
    act(() => vi.advanceTimersByTime(2000));
    // Only 2s elapsed since the last keystroke — no stop yet.
    expect(sendTyping).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(sendTyping).toHaveBeenCalledWith("room-1", undefined, false);
  });

  it("sends typing:false when stopTyping is called (message sent)", () => {
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    act(() => result.current.stopTyping());
    expect(sendTyping).toHaveBeenLastCalledWith("room-1", undefined, false);
    // No pending timers after stop.
    act(() => vi.advanceTimersByTime(5000));
    expect(sendTyping).toHaveBeenCalledTimes(2);
  });

  it("does nothing while the socket is disconnected", () => {
    Object.defineProperty(wsService, "isConnected", { value: false, configurable: true });
    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    expect(sendTyping).not.toHaveBeenCalled();
  });

  it("clears claimed typing state when the socket disconnects", () => {
    let disconnectCb: ((connected: boolean) => void) | null = null;
    onConnection.mockImplementation((cb: (connected: boolean) => void) => {
      disconnectCb = cb;
      return () => true;
    });

    const { result } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledTimes(1);

    act(() => disconnectCb?.(false));
    // State cleared: next keystroke re-sends typing:true.
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledTimes(2);
    expect(sendTyping).toHaveBeenLastCalledWith("room-1", undefined, true);
  });

  it("sends typing:false and clears timers on unmount (no leaks)", () => {
    const { result, unmount } = renderHook(() => useTyping("room-1"));
    act(() => result.current.markTyping());
    expect(sendTyping).toHaveBeenCalledTimes(1);

    act(() => unmount());
    expect(sendTyping).toHaveBeenLastCalledWith("room-1", undefined, false);

    // No timer fires after unmount.
    act(() => vi.advanceTimersByTime(10_000));
    expect(sendTyping).toHaveBeenCalledTimes(2);
  });
});
