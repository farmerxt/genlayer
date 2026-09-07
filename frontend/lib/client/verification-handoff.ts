import type { Verification } from "@/lib/types";

const STORAGE_PREFIX = "agentzproof:verification:";

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function saveVerificationHandoff(verification: Verification): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(verification.id), JSON.stringify(verification));
  } catch {
    // Local storage is best-effort; the server response remains authoritative.
  }
}

export function loadVerificationHandoff(id: string): Verification | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const value = JSON.parse(raw) as Verification;
    return value && value.id === id ? value : null;
  } catch {
    return null;
  }
}
