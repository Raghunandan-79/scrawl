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

    // Helper to check if storage is already full
    const checkStorageFull = () => {
      try {
        const testKey = "__quota_test__";
        localStorage.setItem(testKey, "a");
        localStorage.removeItem(testKey);
      } catch (e) {
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          return true;
        }
      }
      try {
        const testKey = "__quota_test__";
        sessionStorage.setItem(testKey, "a");
        sessionStorage.removeItem(testKey);
      } catch (e) {
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          return true;
        }
      }
      return false;
    };

    // Run initial checks
    if (checkStorageFull()) {
      (window as any).__storageQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent("localstorage-full"));
    }

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          if (estimate.usage >= estimate.quota) {
            (window as any).__storageQuotaExceeded = true;
            window.dispatchEvent(new CustomEvent("localstorage-full"));
          }
        }
      }).catch(() => {});
    }

    // Keep reference to the original functions
    const originalLocalSetItem = localStorage.setItem;
    const originalSessionSetItem = sessionStorage.setItem;

    localStorage.setItem = function (key, value) {
      if ((window as any).__storageQuotaExceeded) {
        return;
      }
      try {
        originalLocalSetItem.apply(this, [key, value]);
      } catch (e) {
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          (window as any).__storageQuotaExceeded = true;
          window.dispatchEvent(new CustomEvent("localstorage-full"));
          return;
        }
        throw e;
      }
    };

    sessionStorage.setItem = function (key, value) {
      if ((window as any).__storageQuotaExceeded) {
        return;
      }
      try {
        originalSessionSetItem.apply(this, [key, value]);
      } catch (e) {
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          (window as any).__storageQuotaExceeded = true;
          window.dispatchEvent(new CustomEvent("localstorage-full"));
          return;
        }
        throw e;
      }
    };

    // Expose a test hook to trigger the toast manually and block writes
    (window as any).__triggerStorageFullToast = () => {
      (window as any).__storageQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent("localstorage-full"));
    };

    return () => {
      localStorage.setItem = originalLocalSetItem;
      sessionStorage.setItem = originalSessionSetItem;
      window.removeEventListener("localstorage-full", handleStorageFull);
    };
  }, []);

  if (!isFull) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#D95F4D] text-white py-3 px-4 shadow-lg flex items-center justify-center gap-3 border-b border-[#C24E3D] font-mono text-sm tracking-wide font-semibold text-center select-none animate-bounce-short">
      <AlertTriangle className="h-5 w-5 animate-pulse text-[#FAF8F5] shrink-0" />
      <span>storage quota exceeded</span>
    </div>
  );
}
