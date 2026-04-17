"use client";
import { useEffect } from "react";

/**
 * Warns the user if they try to navigate away with unsaved changes.
 * Pass `dirty = true` when the form has been modified.
 */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
