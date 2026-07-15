"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function LocalStorageToast() {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageFull = () => {
      setIsFull(true);
    };

    window.addEventListener("localstorage-full", handleStorageFull);

    // Keep reference to the original function
    const originalSetItem = localStorage.setItem;

    localStorage.setItem = function (key, value) {
      try {
        originalSetItem.apply(this, [key, value]);
      } catch (e) {
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          window.dispatchEvent(new CustomEvent("localstorage-full"));
        }
        throw e;
      }
    };

    // Expose a test hook to trigger the toast manually
    (window as any).__triggerStorageFullToast = () => {
      window.dispatchEvent(new CustomEvent("localstorage-full"));
    };

    return () => {
      localStorage.setItem = originalSetItem;
      window.removeEventListener("localstorage-full", handleStorageFull);
    };
  }, []);

  if (!isFull) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#D95F4D] text-white py-3 px-4 shadow-lg flex items-center justify-center gap-3 border-b border-[#C24E3D] font-mono text-sm tracking-wide font-semibold text-center select-none animate-bounce-short">
      <AlertTriangle className="h-5 w-5 animate-pulse text-[#FAF8F5] shrink-0" />
      <span>browser storage full unable to save anything</span>
    </div>
  );
}
