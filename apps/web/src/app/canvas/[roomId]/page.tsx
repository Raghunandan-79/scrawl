"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL } from "../../config";
import { Canvas } from "@/components/Canvas";
import { CanvasElement } from "@/components/canvas-types";
import { Button } from "@repo/ui/button";

export default function CanvasRoomPage() {
  const params = useParams();
  const router = useRouter();
  const pathIdOrSlug = params.roomId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialElements, setInitialElements] = useState<CanvasElement[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [resolvedRoomId, setResolvedRoomId] = useState<string>("");
  const [resolvedRoomSlug, setResolvedRoomSlug] = useState<string>("");

  useEffect(() => {
    let token = null;
    try {
      token = localStorage.getItem("token");
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
    const isGuest = pathIdOrSlug === "guest";

    if (!token && !isGuest) {
      router.push("/signin");
      return;
    }

    const isNumeric = /^\d+$/.test(pathIdOrSlug);

    const migrateOldStorageKeys = (activeRoomId: string) => {
      try {
        const oldKeys = ["canvas_elements", "scrawl_elements", "elements"];
        for (const oldKey of oldKeys) {
          const data = localStorage.getItem(oldKey);
          if (data) {
            const targetKey =
              activeRoomId === "guest"
                ? "guest_canvas_elements"
                : `scrawl_elements_${activeRoomId}`;

            // If the new key doesn't have data yet, migrate it
            if (!localStorage.getItem(targetKey)) {
              localStorage.setItem(targetKey, data);
            }
            localStorage.removeItem(oldKey);
          }
        }
      } catch (e) {
        console.warn("Legacy key migration failed:", e);
      }
    };

    const resolveWorkspace = async () => {
      try {
        let activeRoomId = "";
        let activeRoomSlug = "";
        let readMode = true;

        if (isGuest) {
          activeRoomId = "guest";
          activeRoomSlug = "guest";
          readMode = false;

          migrateOldStorageKeys(activeRoomId);

          let stored = null;
          try {
            stored = localStorage.getItem("guest_canvas_elements");
          } catch (e) {}

          setInitialElements(stored ? JSON.parse(stored) : []);
          setResolvedRoomId(activeRoomId);
          setResolvedRoomSlug(activeRoomSlug);
          setIsReadOnly(readMode);
          setLoading(false);
          return;
        }

        if (isNumeric) {
          // It's the numerical ID -> Read Only mode
          activeRoomId = pathIdOrSlug;
          readMode = true;
        } else {
          // It's the slug -> full Edit Mode
          const joinResponse = await axios.post(
            `${BACKEND_URL}/api/v1/room/join-room/${pathIdOrSlug}`,
          );
          if (joinResponse.data?.room) {
            activeRoomId = joinResponse.data.room.id.toString();
            activeRoomSlug = joinResponse.data.room.slug;
            readMode = false;
          } else {
            setError("Workspace room not found.");
            setLoading(false);
            return;
          }
        }

        setResolvedRoomId(activeRoomId);
        setResolvedRoomSlug(activeRoomSlug);
        setIsReadOnly(readMode);

        migrateOldStorageKeys(activeRoomId);

        const storageKey = `scrawl_elements_${activeRoomId}`;
        let stored = null;
        try {
          stored = localStorage.getItem(storageKey);
        } catch (e) {}

        if (stored) {
          try {
            setInitialElements(JSON.parse(stored));
          } catch (e) {}
          setError(null);
          setLoading(false); // Optimistically load cache first
        }

        // Always fetch from backend to verify and get the absolute latest state
        try {
          const response = await axios.get(
            `${BACKEND_URL}/api/v1/chats/get-chats/${activeRoomId}`,
            {
              headers: {
                token: token || "",
              },
            },
          );

          const rawChats = response.data?.messages || [];
          const chronologicalChats = [...rawChats].reverse();

          const elementsMap: Record<string, CanvasElement> = {};
          chronologicalChats.forEach((msg: any) => {
            try {
              const action = JSON.parse(msg.message);
              if (action.type === "add" && action.element) {
                elementsMap[action.element.id] = action.element;
              } else if (action.type === "update" && action.element) {
                elementsMap[action.element.id] = action.element;
              } else if (action.type === "delete" && action.elementId) {
                delete elementsMap[action.elementId];
              }
            } catch (e) {}
          });

          const fetchedElements = Object.values(elementsMap);
          setInitialElements(fetchedElements);
          try {
            localStorage.setItem(storageKey, JSON.stringify(fetchedElements));
          } catch (e) {}
          setError(null);
        } catch (err: any) {
          console.error("Failed to load room drawing history from server:", err);
          if (!stored) {
            setError(
              err.response?.data?.message || "Could not retrieve drawing history.",
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to resolve workspace:", err);
        setError(
          err.response?.data?.message || "Could not retrieve drawing history.",
        );
      } finally {
        setLoading(false);
      }
    };

    resolveWorkspace();
  }, [pathIdOrSlug, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAF8F5] font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E1E1E] border-t-transparent mb-4"></div>
        <p className="text-sm font-semibold text-[#1E1E1E] uppercase tracking-wider font-mono">
          Loading your canvas workspace...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAF8F5] font-sans px-4">
        <div className="max-w-md w-full bg-white border border-[#E5E0D8] p-6 rounded-lg text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#D95F4D] mb-2">
            Error Loading Workspace
          </h2>
          <p className="text-sm text-[#706B5F] mb-6">{error}</p>
          <Button
            variant="primary"
            className="px-6"
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen">
      <Canvas
        roomId={resolvedRoomId}
        roomSlug={resolvedRoomSlug}
        initialElements={initialElements}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
