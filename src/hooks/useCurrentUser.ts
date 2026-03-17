"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "food-tracker-user";

export function useCurrentUser() {
  const [userId, setUserIdState] = useState<string>("giovanna");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "giovanna" || stored === "ricardo") {
      setUserIdState(stored);
    }
  }, []);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { userId, setUserId };
}
