"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "devsync_high_contrast";

/**
 * Hook to manage high-contrast mode state.
 * Toggles the `.high-contrast` class on <html> and persists to localStorage.
 */
export function useHighContrast() {
  const [enabled, setEnabledState] = useState(() => {
    // Initialise from localStorage
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    document.documentElement.classList.toggle("high-contrast", value);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  // Sync on mount (in case class was set server-side)
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", enabled);
  }, [enabled]);

  return { enabled, setEnabled, toggle };
}
