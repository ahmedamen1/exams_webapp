"use client";

import { sampleState } from "./mockData";

const STORAGE_KEY = "yalla-nfhm-exam-platform";

export function loadState() {
  if (typeof window === "undefined") {
    return sampleState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));
    return sampleState;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));
    return sampleState;
  }
}

export function saveState(state) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function resetState() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));
  }
  return sampleState;
}
