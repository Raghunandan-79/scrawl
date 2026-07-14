"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tool, CanvasElement, Point, CanvasAction } from "./canvas-types";
import { renderElement } from "./canvas-renderer";
import { useSocket } from "../app/hooks/useSocket";
import { Button } from "@repo/ui/button";
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Triangle,
  Diamond,
  Minus,
  ArrowRight,
  Pencil,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Eraser,
  Home,
  Share2,
  Lock,
  Unlock,
  Locate,
} from "lucide-react";

interface CanvasProps {
  roomId: string;
  roomSlug: string;
  initialElements: CanvasElement[];
  isReadOnly?: boolean;
}

export function Canvas({
  roomId,
  roomSlug,
  initialElements,
  isReadOnly = false,
}: CanvasProps) {
  const router = useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedEdit, setCopiedEdit] = useState(false);
  const [copiedRead, setCopiedRead] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  // Default to hand tool if read-only, rect otherwise
  const [tool, setTool] = useState<Tool>(isReadOnly ? "hand" : "rect");

  // Style Options
  const [strokeColor, setStrokeColor] = useState("#1E1E1E");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeStyle, setStrokeStyle] = useState<"solid" | "dashed">("solid");
  const [roughMode, setRoughMode] = useState(true);
  const [showMobileStyles, setShowMobileStyles] = useState(false);
  // Viewport transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  const isCanvasLockedRef = useRef(isCanvasLocked);
  const [lockedSize, setLockedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const lockedSizeRef = useRef<{ width: number; height: number } | null>(null);


  useEffect(() => {
    isCanvasLockedRef.current = isCanvasLocked;
    if (isCanvasLocked) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      const canvas = canvasRef.current;
      if (canvas) {
        const size = {
          width: canvas.parentElement?.clientWidth || window.innerWidth,
          height: canvas.parentElement?.clientHeight || window.innerHeight,
        };
        setLockedSize(size);
        lockedSizeRef.current = size;
      }
    } else {
      setLockedSize(null);
      lockedSizeRef.current = null;
    }
  }, [isCanvasLocked]);

  // Collaborator cursors state
  const [collaboratorCursors, setCollaboratorCursors] = useState<
    Record<
      string,
      { x: number; y: number; userName: string; updatedAt: number }
    >
  >({});

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [activeElement, setActiveElement] = useState<CanvasElement | null>(
    null,
  );
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    text: string;
    editingElementId?: string;
  } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Selection state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [dragMode, setDragMode] = useState<"move" | "resize" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // "nw", "ne", "se", "sw"
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Undo/Redo Stacks (Track own created elements)
  const [myElements, setMyElements] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);

  // Trigger redraw on async events (e.g. image loads)
  const [redrawTrigger, setRedrawTrigger] = useState(0);

  const elementsRef = useRef(elements);
  const handleUndoRef = useRef<() => void>(() => {});
  const handleRedoRef = useRef<() => void>(() => {});
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const lastMouseClientPos = useRef<Point>({ x: 0, y: 0 });

  // Refs to avoid stale closures in animation loops
  const toolRef = useRef(tool);
  const activeElementRef = useRef(activeElement);
  const selectedElementIdRef = useRef(selectedElementId);
  const dragModeRef = useRef(dragMode);
  const dragOffsetRef = useRef(dragOffset);
  const resizeHandleRef = useRef(resizeHandle);
  const startPointRef = useRef(startPoint);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);
  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);
  useEffect(() => {
    activeElementRef.current = activeElement;
  }, [activeElement]);
  useEffect(() => {
    selectedElementIdRef.current = selectedElementId;
  }, [selectedElementId]);
  useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);
  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);
  useEffect(() => {
    resizeHandleRef.current = resizeHandle;
  }, [resizeHandle]);
  useEffect(() => {
    startPointRef.current = startPoint;
  }, [startPoint]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Window resize tracking state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Pinch to zoom state variables
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const isPinching = useRef<boolean>(false);

  useEffect(() => {
    if (!isDrawing || tool === "hand") return;

    let animationFrameId: number;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const clientX = lastMouseClientPos.current.x;
      const clientY = lastMouseClientPos.current.y;

      if (clientX === 0 && clientY === 0) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      let scrollX = 0;
      let scrollY = 0;
      const edgeThreshold = 40;
      const maxSpeed = 12;

      if (clientX < rect.left + edgeThreshold) {
        scrollX = Math.max(
          1,
          ((rect.left + edgeThreshold - clientX) / edgeThreshold) * maxSpeed,
        );
      } else if (clientX > rect.right - edgeThreshold) {
        scrollX = -Math.max(
          1,
          ((clientX - (rect.right - edgeThreshold)) / edgeThreshold) * maxSpeed,
        );
      }

      if (clientY < rect.top + edgeThreshold) {
        scrollY = Math.max(
          1,
          ((rect.top + edgeThreshold - clientY) / edgeThreshold) * maxSpeed,
        );
      } else if (clientY > rect.bottom - edgeThreshold) {
        scrollY = -Math.max(
          1,
          ((clientY - (rect.bottom - edgeThreshold)) / edgeThreshold) *
            maxSpeed,
        );
      }

      if (scrollX !== 0 || scrollY !== 0) {
        setPan((prev) => {
          const nextPan = { x: prev.x + scrollX, y: prev.y + scrollY };

          const mouseWorldPos = {
            x: (clientX - rect.left - nextPan.x) / zoom,
            y: (clientY - rect.top - nextPan.y) / zoom,
          };

          if (toolRef.current === "select" && selectedElementIdRef.current) {
            setElements((elementsPrev) =>
              elementsPrev.map((el) => {
                if (el.id !== selectedElementIdRef.current) return el;

                if (dragModeRef.current === "move") {
                  return {
                    ...el,
                    x: mouseWorldPos.x - dragOffsetRef.current.x,
                    y: mouseWorldPos.y - dragOffsetRef.current.y,
                  };
                }

                if (
                  dragModeRef.current === "resize" &&
                  resizeHandleRef.current
                ) {
                  let x = el.x;
                  let y = el.y;
                  let width = el.width;
                  let height = el.height;

                  const xMin = Math.min(el.x, el.x + el.width);
                  const xMax = Math.max(el.x, el.x + el.width);
                  const yMin = Math.min(el.y, el.y + el.height);
                  const yMax = Math.max(el.y, el.y + el.height);

                  switch (resizeHandleRef.current) {
                    case "nw":
                      x = mouseWorldPos.x;
                      y = mouseWorldPos.y;
                      width = xMax - mouseWorldPos.x;
                      height = yMax - mouseWorldPos.y;
                      break;
                    case "ne":
                      y = mouseWorldPos.y;
                      width = mouseWorldPos.x - xMin;
                      height = yMax - mouseWorldPos.y;
                      break;
                    case "se":
                      width = mouseWorldPos.x - xMin;
                      height = mouseWorldPos.y - yMin;
                      break;
                    case "sw":
                      x = mouseWorldPos.x;
                      width = xMax - mouseWorldPos.x;
                      height = mouseWorldPos.y - yMin;
                      break;
                  }

                  return { ...el, x, y, width, height };
                }

                return el;
              }),
            );
          } else if (activeElementRef.current) {
            if (activeElementRef.current.type === "pencil") {
              setActiveElement((activePrev) => {
                if (!activePrev || !activePrev.points) return activePrev;
                return {
                  ...activePrev,
                  points: [...activePrev.points, mouseWorldPos],
                };
              });
            } else {
              setActiveElement((activePrev) => {
                if (!activePrev) return activePrev;
                return {
                  ...activePrev,
                  width: mouseWorldPos.x - startPointRef.current.x,
                  height: mouseWorldPos.y - startPointRef.current.y,
                };
              });
            }
          }

          return nextPan;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDrawing, zoom]);

  // Socket
  const { socket, loading } = useSocket();

  // Load initial elements properly
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      setElements(initialElements);
      setMyElements(initialElements.map((el) => el.id));
    }
  }, [initialElements]);

  // Connect to websocket room
  useEffect(() => {
    if (socket && !loading) {
      socket.send(
        JSON.stringify({
          type: "join_room",
          roomId: roomId.toString(),
        }),
      );

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (
            parsedData.type === "chat" &&
            parsedData.roomId === roomId.toString()
          ) {
            const action: CanvasAction = JSON.parse(parsedData.message);
            handleCollaborativeAction(action);
          } else if (
            parsedData.type === "cursor_move" &&
            parsedData.roomId === roomId.toString()
          ) {
            setCollaboratorCursors((prev) => ({
              ...prev,
              [parsedData.userId]: {
                x: parsedData.x,
                y: parsedData.y,
                userName: parsedData.userName,
                updatedAt: Date.now(),
              },
            }));
          }
        } catch (e) {
          console.error("Error processing websocket message:", e);
        }
      };
    }
  }, [socket, loading, roomId]);

  // Periodic cleanup of stale cursors (inactive/offline collaborators)
  useEffect(() => {
    const interval = setInterval(() => {
      setCollaboratorCursors((prev) => {
        const now = Date.now();
        let changed = false;
        const next = { ...prev };
        for (const [userId, cursor] of Object.entries(prev)) {
          if (now - cursor.updatedAt >= 3000) {
            delete next[userId];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save canvas elements to localStorage for all room types
  useEffect(() => {
    if (roomId) {
      const storageKey =
        roomId === "guest"
          ? "guest_canvas_elements"
          : `scrawl_elements_${roomId}`;
      localStorage.setItem(storageKey, JSON.stringify(elements));
    }
  }, [elements, roomId]);

  // Process canvas action from collab partners
  const handleCollaborativeAction = (action: CanvasAction) => {
    setElements((prev) => {
      switch (action.type) {
        case "add":
          if (action.element) {
            // Replace existing or append new
            const idx = prev.findIndex((e) => e.id === action.element!.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = action.element;
              return next;
            }
            return [...prev, action.element];
          }
          return prev;
        case "update":
          if (action.element) {
            return prev.map((e) =>
              e.id === action.element!.id ? action.element! : e,
            );
          }
          return prev;
        case "delete":
          if (action.elementId) {
            return prev.filter((e) => e.id !== action.elementId);
          }
          return prev;
        default:
          return prev;
      }
    });
  };

  // Broadcast an action to the WS
  const broadcastAction = (action: CanvasAction) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "chat",
          roomId: roomId.toString(),
          message: JSON.stringify(action),
        }),
      );
    }
  };

  // Convert Screen Coordinates -> World Coordinates
  const getMouseWorldPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  // Helper: Find element at point
  const getElementAtPosition = (x: number, y: number): CanvasElement | null => {
    // Iterate from newest to oldest (reverse order)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        el.type === "rect" ||
        el.type === "text" ||
        el.type === "image" ||
        el.type === "triangle" ||
        el.type === "rhombus"
      ) {
        const xMin = Math.min(el.x, el.x + el.width);
        const xMax = Math.max(el.x, el.x + el.width);
        const yMin = Math.min(el.y, el.y + el.height);
        const yMax = Math.max(el.y, el.y + el.height);
        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          return el;
        }
      } else if (el.type === "ellipse") {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = Math.abs(el.width / 2);
        const ry = Math.abs(el.height / 2);
        const normalizedX = (x - cx) / rx;
        const normalizedY = (y - cy) / ry;
        if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
          return el;
        }
      } else if (el.type === "line" || el.type === "arrow") {
        // Distance from point to line segment
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = x1;
          yy = y1;
        } else if (param > 1) {
          xx = x2;
          yy = y2;
        } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
        }
        const dist = Math.hypot(x - xx, y - yy);
        if (dist < 8) return el;
      } else if (el.type === "pencil" && el.points) {
        // Check distance to any point
        for (const pt of el.points) {
          if (Math.hypot(x - pt.x, y - pt.y) < 10) {
            return el;
          }
        }
      }
    }
    return null;
  };

  // Find resize handle clicked
  const getResizeHandleAtPos = (
    x: number,
    y: number,
    el: CanvasElement,
  ): string | null => {
    const handleSize = 8 / zoom;
    const xMin = Math.min(el.x, el.x + el.width);
    const xMax = Math.max(el.x, el.x + el.width);
    const yMin = Math.min(el.y, el.y + el.height);
    const yMax = Math.max(el.y, el.y + el.height);

    const handles = [
      { name: "nw", x: xMin, y: yMin },
      { name: "ne", x: xMax, y: yMin },
      { name: "se", x: xMax, y: yMax },
      { name: "sw", x: xMin, y: yMax },
    ];

    for (const h of handles) {
      if (Math.hypot(x - h.x, y - h.y) <= handleSize * 2) {
        return h.name;
      }
    }
    return null;
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset size scaled by devicePixelRatio for high-DPI screens
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displayWidth = canvas.parentElement?.clientWidth || window.innerWidth;
    const displayHeight =
      canvas.parentElement?.clientHeight || window.innerHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Clear using full buffer size
    ctx.fillStyle = lockedSize ? "#E5E0D8" : "#FAF8F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply dpr scale, zoom & pan
    ctx.save();
    ctx.scale(dpr, dpr);

    if (lockedSize) {
      const pageW = lockedSize.width;
      const pageH = lockedSize.height;

      // Draw white sheet starting at (0, 0)
      ctx.fillStyle = "#FAF8F5";
      ctx.fillRect(0, 0, pageW, pageH);

      // Draw border
      ctx.strokeStyle = "#C4C0B5";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, pageW, pageH);

      // Clip inside the page
      ctx.beginPath();
      ctx.rect(0, 0, pageW, pageH);
      ctx.clip();
    } else {
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
    }

    // Render stored elements
    elements.forEach((el) => {
      if (textInput && textInput.editingElementId === el.id) return;
      renderElement(ctx, el, roughMode, zoom, () => {
        setRedrawTrigger((prev) => prev + 1);
      });
    });

    // Render active drawing element
    if (activeElement) {
      renderElement(ctx, activeElement, roughMode, zoom, () => {
        setRedrawTrigger((prev) => prev + 1);
      });
    }

    // Render selection box
    if (tool === "select" && selectedElementId) {
      const el = elements.find((e) => e.id === selectedElementId);
      if (el) {
        ctx.strokeStyle = "#D95F4D";
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4, 4]);

        const xMin = Math.min(el.x, el.x + el.width);
        const xMax = Math.max(el.x, el.x + el.width);
        const yMin = Math.min(el.y, el.y + el.height);
        const yMax = Math.max(el.y, el.y + el.height);

        ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);

        // Draw handles
        ctx.fillStyle = "#FAF8F5";
        ctx.strokeStyle = "#D95F4D";
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([]);

        const hSize = 6 / zoom;
        const drawHandle = (hx: number, hy: number) => {
          ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
          ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
        };

        drawHandle(xMin, yMin);
        drawHandle(xMax, yMin);
        drawHandle(xMax, yMax);
        drawHandle(xMin, yMax);
      }
    }

    ctx.restore();

    // Render collaborator cursors in screen space
    const activeCursors = Object.entries(collaboratorCursors).filter(
      ([_, c]) => Date.now() - c.updatedAt < 3000,
    );

    activeCursors.forEach(([userId, cursor]) => {
      const screenX = cursor.x * zoom + pan.x;
      const screenY = cursor.y * zoom + pan.y;

      ctx.save();
      ctx.translate(screenX, screenY);

      // Stable color based on username
      const colors = [
        "#D95F4D",
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#EC4899",
      ];
      const charCodeSum = cursor.userName
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const color = colors[charCodeSum % colors.length];

      ctx.fillStyle = color;
      ctx.strokeStyle = "#FAF8F5";
      ctx.lineWidth = 1.5;

      // Draw mouse cursor arrow (pointing top-left)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(4.5, 12);
      ctx.lineTo(8.5, 20);
      ctx.lineTo(11, 19);
      ctx.lineTo(7, 11);
      ctx.lineTo(12, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw name tag
      ctx.font = "bold 11px sans-serif";
      const nameWidth = ctx.measureText(cursor.userName).width;

      ctx.fillStyle = color;
      const paddingX = 6;
      const paddingY = 4;
      const tagX = 12;
      const tagY = 12;
      const tagWidth = nameWidth + paddingX * 2;
      const tagHeight = 16 + paddingY;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 4);
      } else {
        ctx.rect(tagX, tagY, tagWidth, tagHeight);
      }
      ctx.fill();

      // Text label inside the name tag
      ctx.fillStyle = "#FAF8F5";
      ctx.fillText(cursor.userName, tagX + paddingX, tagY + 12);

      ctx.restore();
    });
  }, [
    elements,
    activeElement,
    selectedElementId,
    zoom,
    pan,
    roughMode,
    tool,
    collaboratorCursors,
    canvasSize,
    redrawTrigger,
  ]);

  // Handle infinite scroll wheel and zoom events
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isCanvasLockedRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      e.preventDefault();
      if (e.ctrlKey) {
        // Zoom: Calculate factor continuously based on deltaY magnitude to support smooth touchpad pinch
        const zoomIntensity = 0.005;
        let factor = Math.exp(-e.deltaY * zoomIntensity);
        // Clamp to prevent huge speed jumps on large mouse wheel ticks
        factor = Math.max(0.9, Math.min(1.1, factor));

        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;
        const newZoom = Math.min(10, Math.max(0.1, currentZoom * factor));

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate new pan relative to cursor position
        const worldX = (mouseX - currentPan.x) / currentZoom;
        const worldY = (mouseY - currentPan.y) / currentZoom;

        setZoom(newZoom);
        setPan({
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        });
      } else {
        // Pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    // Support Safari Mac trackpad pinch gestures
    let gestureStartZoom = 1;
    let gestureStartPan = { x: 0, y: 0 };

    const handleGestureStart = (e: any) => {
      e.preventDefault();
      gestureStartZoom = zoomRef.current;
      gestureStartPan = panRef.current;
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const currentZoom = gestureStartZoom;
      const currentPan = gestureStartPan;
      const newZoom = Math.min(10, Math.max(0.1, currentZoom * e.scale));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX !== undefined ? e.clientX - rect.left : rect.width / 2;
      const mouseY = e.clientY !== undefined ? e.clientY - rect.top : rect.height / 2;

      const worldX = (mouseX - currentPan.x) / currentZoom;
      const worldY = (mouseY - currentPan.y) / currentZoom;

      setZoom(newZoom);
      setPan({
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom,
      });
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("gesturestart", handleGestureStart, { passive: false });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
    };
  }, []);

  // Keyboard hotkeys for tools and undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "h":
          setTool("hand");
          break;
        case "r":
          setTool("rect");
          break;
        case "o":
        case "c":
          setTool("ellipse");
          break;
        case "i":
          setTool("triangle");
          break;
        case "g":
          setTool("rhombus");
          break;
        case "l":
          setTool("line");
          break;
        case "a":
          setTool("arrow");
          break;
        case "p":
        case "d":
          setTool("pencil");
          break;
        case "t":
          setTool("text");
          break;
        case "e":
          setTool("eraser");
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleUndoRef.current();
          }
          break;
        case "y":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRedoRef.current();
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle Resize of canvas on screen size change
  useEffect(() => {
    const handleResize = () => {
      const parent = canvasRef.current?.parentElement;
      setCanvasSize({
        width: parent?.clientWidth || window.innerWidth,
        height: parent?.clientHeight || window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // trigger initial size computation
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse Handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (textInput) {
      // Complete text edit
      commitTextInput();
      return;
    }

    if (isReadOnly) {
      if (tool === "hand" && !isCanvasLocked) {
        setIsDrawing(true);
        setStartPoint({ x: clientX, y: clientY });
      }
      return;
    }

    if (tool === "select") {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300; // ms
      const DISTANCE_THRESHOLD = 15; // px

      if (
        lastTapRef.current &&
        now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
        Math.hypot(clientX - lastTapRef.current.x, clientY - lastTapRef.current.y) < DISTANCE_THRESHOLD
      ) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = (clientX - rect.left - pan.x) / zoom;
          const mouseY = (clientY - rect.top - pan.y) / zoom;

          const clickedEl = getElementAtPosition(mouseX, mouseY);
          if (clickedEl && clickedEl.type === "text") {
            setTextInput({
              x: clickedEl.x,
              y: clickedEl.y,
              text: clickedEl.text || "",
              editingElementId: clickedEl.id,
            });
            setSelectedElementId(null);
            setIsDrawing(false);
            setTimeout(() => {
              textInputRef.current?.focus();
            }, 50);
            lastTapRef.current = null;
            return;
          } else {
            setTextInput({
              x: mouseX,
              y: mouseY,
              text: "",
            });
            setSelectedElementId(null);
            setIsDrawing(false);
            setTimeout(() => {
              textInputRef.current?.focus();
            }, 50);
            lastTapRef.current = null;
            return;
          }
        }
      }
      lastTapRef.current = { time: now, x: clientX, y: clientY };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let mouseX = clientX - rect.left;
    let mouseY = clientY - rect.top;

    if (lockedSize) {
      const pageW = lockedSize.width;
      const pageH = lockedSize.height;
      mouseX = Math.max(0, Math.min(pageW, mouseX));
      mouseY = Math.max(0, Math.min(pageH, mouseY));
    } else {
      mouseX = (mouseX - pan.x) / zoom;
      mouseY = (mouseY - pan.y) / zoom;
    }

    const mousePos = { x: mouseX, y: mouseY };

    setIsDrawing(true);
    setStartPoint(mousePos);

    // Track state for undo
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);

    if (tool === "eraser") {
      const clickedEl = getElementAtPosition(mousePos.x, mousePos.y);
      if (clickedEl) {
        setElements((prev) => prev.filter((el) => el.id !== clickedEl.id));
        setMyElements((prev) => prev.filter((id) => id !== clickedEl.id));
        broadcastAction({ type: "delete", elementId: clickedEl.id });
      }

      // Initialize eraser trail
      const newId = `eraser-${Date.now()}`;
      const newElement: CanvasElement = {
        id: newId,
        type: "eraser",
        x: mousePos.x,
        y: mousePos.y,
        width: 0,
        height: 0,
        strokeColor: "rgba(245, 199, 193, 0.5)",
        fillColor: "transparent",
        strokeWidth: 18,
        strokeStyle: "solid",
        points: [mousePos],
      };
      setActiveElement(newElement);
      return;
    }

    if (tool === "hand") {
      if (isCanvasLocked) return;
      setStartPoint({ x: clientX, y: clientY });
      return;
    }

    if (tool === "select") {
      const clickedEl = getElementAtPosition(mousePos.x, mousePos.y);
      if (clickedEl) {
        setSelectedElementId(clickedEl.id);
        const handle = getResizeHandleAtPos(mousePos.x, mousePos.y, clickedEl);
        if (handle) {
          setDragMode("resize");
          setResizeHandle(handle);
        } else {
          setDragMode("move");
          setDragOffset({
            x: mousePos.x - clickedEl.x,
            y: mousePos.y - clickedEl.y,
          });
        }
      } else {
        setSelectedElementId(null);
        setDragMode(null);
      }
      return;
    }

    if (tool === "text") {
      setTextInput({ x: mousePos.x, y: mousePos.y, text: "" });
      setIsDrawing(false);
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
      return;
    }

    // Creating shapes
    const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newElement: CanvasElement = {
      id: newId,
      type: tool as any,
      x: mousePos.x,
      y: mousePos.y,
      width: 0,
      height: 0,
      strokeColor,
      fillColor,
      strokeWidth,
      strokeStyle,
      points: tool === "pencil" ? [mousePos] : undefined,
    };

    setActiveElement(newElement);
  };

  const updateDrawingState = (
    clientX: number,
    clientY: number,
    currentPan: Point,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Calculate world position based on currentPan
    let mouseX = clientX - rect.left;
    let mouseY = clientY - rect.top;

    if (lockedSize) {
      const pageW = lockedSize.width;
      const pageH = lockedSize.height;
      mouseX = Math.max(0, Math.min(pageW, mouseX));
      mouseY = Math.max(0, Math.min(pageH, mouseY));
    } else {
      mouseX = (mouseX - currentPan.x) / zoom;
      mouseY = (mouseY - currentPan.y) / zoom;
    }

    const mouseWorldPos = { x: mouseX, y: mouseY };

    if (tool === "eraser") {
      const clickedEl = getElementAtPosition(mouseWorldPos.x, mouseWorldPos.y);
      if (clickedEl) {
        setElements((prev) => prev.filter((el) => el.id !== clickedEl.id));
        setMyElements((prev) => prev.filter((id) => id !== clickedEl.id));
        broadcastAction({ type: "delete", elementId: clickedEl.id });
      }

      // Update eraser trail points
      setActiveElement((prev) => {
        if (!prev || prev.type !== "eraser") return prev;
        return {
          ...prev,
          points: [...(prev.points || []), mouseWorldPos],
        };
      });
      return;
    }

    if (tool === "hand") {
      return;
    }

    if (tool === "select" && selectedElementId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;

          if (dragMode === "move") {
            return {
              ...el,
              x: mouseWorldPos.x - dragOffset.x,
              y: mouseWorldPos.y - dragOffset.y,
            };
          }

          if (dragMode === "resize" && resizeHandle) {
            let x = el.x;
            let y = el.y;
            let width = el.width;
            let height = el.height;
            let strokeWidth = el.strokeWidth;

            const xMin = Math.min(el.x, el.x + el.width);
            const xMax = Math.max(el.x, el.x + el.width);
            const yMin = Math.min(el.y, el.y + el.height);
            const yMax = Math.max(el.y, el.y + el.height);

            if (el.type === "text") {
              const W = Math.abs(el.width);
              const H = Math.abs(el.height);
              if (W > 0 && H > 0) {
                let vX = 0;
                let vY = 0;
                let dx = 0;
                let dy = 0;

                switch (resizeHandle) {
                  case "se":
                    vX = W;
                    vY = H;
                    dx = mouseWorldPos.x - xMin;
                    dy = mouseWorldPos.y - yMin;
                    break;
                  case "sw":
                    vX = -W;
                    vY = H;
                    dx = mouseWorldPos.x - xMax;
                    dy = mouseWorldPos.y - yMin;
                    break;
                  case "ne":
                    vX = W;
                    vY = -H;
                    dx = mouseWorldPos.x - xMin;
                    dy = mouseWorldPos.y - yMax;
                    break;
                  case "nw":
                    vX = -W;
                    vY = -H;
                    dx = mouseWorldPos.x - xMax;
                    dy = mouseWorldPos.y - yMax;
                    break;
                }

                let s = (dx * vX + dy * vY) / (W * W + H * H);
                if (s < 0.05) s = 0.05;

                width = W * s;
                height = H * s;
                strokeWidth = el.strokeWidth * s;

                switch (resizeHandle) {
                  case "se":
                    x = xMin;
                    y = yMin;
                    break;
                  case "sw":
                    x = xMax - width;
                    y = yMin;
                    break;
                  case "ne":
                    x = xMin;
                    y = yMax - height;
                    break;
                  case "nw":
                    x = xMax - width;
                    y = yMax - height;
                    break;
                }
              }
            } else {
              switch (resizeHandle) {
                case "nw":
                  x = mouseWorldPos.x;
                  y = mouseWorldPos.y;
                  width = xMax - mouseWorldPos.x;
                  height = yMax - mouseWorldPos.y;
                  break;
                case "ne":
                  y = mouseWorldPos.y;
                  width = mouseWorldPos.x - xMin;
                  height = yMax - mouseWorldPos.y;
                  break;
                case "se":
                  width = mouseWorldPos.x - xMin;
                  height = mouseWorldPos.y - yMin;
                  break;
                case "sw":
                  x = mouseWorldPos.x;
                  width = xMax - mouseWorldPos.x;
                  height = mouseWorldPos.y - yMin;
                  break;
              }
            }

            return { ...el, x, y, width, height, strokeWidth };
          }

          return el;
        }),
      );
      return;
    }

    if (!activeElement) return;

    if (activeElement.type === "pencil") {
      setActiveElement((prev) => {
        if (!prev || !prev.points) return prev;
        return {
          ...prev,
          points: [...prev.points, mouseWorldPos],
        };
      });
    } else {
      setActiveElement((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          width: mouseWorldPos.x - startPoint.x,
          height: mouseWorldPos.y - startPoint.y,
        };
      });
    }
  };

  const lastCursorSent = useRef<number>(0);
  const sendCursorPosition = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSent.current > 50) {
      // Throttle 50ms
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "cursor_move",
            roomId: roomId.toString(),
            x,
            y,
          }),
        );
        lastCursorSent.current = now;
      }
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    // Record current mouse position
    lastMouseClientPos.current = { x: clientX, y: clientY };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let mouseX = clientX - rect.left;
    let mouseY = clientY - rect.top;

    if (lockedSize) {
      const pageW = lockedSize.width;
      const pageH = lockedSize.height;
      mouseX = Math.max(0, Math.min(pageW, mouseX));
      mouseY = Math.max(0, Math.min(pageH, mouseY));
    } else {
      mouseX = (mouseX - pan.x) / zoom;
      mouseY = (mouseY - pan.y) / zoom;
    }

    const worldX = mouseX;
    const worldY = mouseY;

    sendCursorPosition(worldX, worldY);

    if (!isDrawing) return;

    if (tool === "hand") {
      if (isCanvasLocked) return;
      const dx = clientX - startPoint.x;
      const dy = clientY - startPoint.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartPoint({ x: clientX, y: clientY });
      return;
    }

    updateDrawingState(clientX, clientY, pan);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setDragMode(null);
    setResizeHandle(null);

    if (activeElement) {
      if (activeElement.type === "eraser") {
        setActiveElement(null);
      } else {
        // Validate element has size
        const hasSize =
          activeElement.type === "pencil" ||
          Math.abs(activeElement.width) > 2 ||
          Math.abs(activeElement.height) > 2;

        if (hasSize) {
          setElements((prev) => [...prev, activeElement]);
          setMyElements((prev) => [...prev, activeElement.id]);
          broadcastAction({ type: "add", element: activeElement });
        }
        setActiveElement(null);
      }
    }

    if (tool === "select" && selectedElementId) {
      const updated = elements.find((e) => e.id === selectedElementId);
      if (updated) {
        broadcastAction({ type: "update", element: updated });
      }
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && e.buttons === 0) {
      handleEnd();
      return;
    }
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };


  // Global mouseup listener to catch releases outside the canvas boundaries
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing) {
        handleEnd();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDrawing, activeElement, selectedElementId, elements]);

  // Manual non-passive touch event listeners for preventing browser scrolling while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        setIsDrawing(false);
        setActiveElement(null);
        if (isCanvasLockedRef.current) return;
        isPinching.current = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        pinchStartDist.current = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        pinchStartZoom.current = zoomRef.current;
        return;
      }

      if (e.touches.length === 1 && !isPinching.current) {
        const touch = e.touches[0];
        if (toolRef.current !== "hand" && toolRef.current !== "select") {
          if (e.cancelable) e.preventDefault();
        }
        handleStart(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        e.touches.length === 2 &&
        isPinching.current &&
        pinchStartDist.current !== null
      ) {
        if (e.cancelable) e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        const factor = currentDist / pinchStartDist.current;
        const newZoom = Math.min(
          10,
          Math.max(0.1, pinchStartZoom.current * factor),
        );

        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const rect = canvas.getBoundingClientRect();
        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;

        // World position before zoom change
        const worldX = (midX - rect.left - currentPan.x) / currentZoom;
        const worldY = (midY - rect.top - currentPan.y) / currentZoom;

        setZoom(newZoom);
        setPan({
          x: midX - rect.left - worldX * newZoom,
          y: midY - rect.top - worldY * newZoom,
        });
        return;
      }

      if (e.touches.length === 1 && !isPinching.current) {
        if (toolRef.current !== "hand" && toolRef.current !== "select") {
          if (e.cancelable) e.preventDefault();
        }
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isPinching.current = false;
        pinchStartDist.current = null;
        handleEnd();
      } else if (e.touches.length === 1) {
        isPinching.current = false;
        pinchStartDist.current = null;
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [
    elements,
    activeElement,
    selectedElementId,
    dragMode,
    resizeHandle,
    dragOffset,
    startPoint,
    pan,
    zoom,
    roughMode,
    tool,
    textInput,
    isReadOnly,
    strokeColor,
    fillColor,
    strokeWidth,
    strokeStyle,
    canvasSize,
  ]);

  // Text tools helper
  const commitTextInput = () => {
    if (!textInput) return;

    if (!textInput.text.trim()) {
      if (textInput.editingElementId) {
        setElements((prev) => prev.filter((el) => el.id !== textInput.editingElementId));
        setMyElements((prev) => prev.filter((id) => id !== textInput.editingElementId));
        broadcastAction({ type: "delete", elementId: textInput.editingElementId });
      }
      setTextInput(null);
      return;
    }

    const editingElement = textInput.editingElementId
      ? elements.find((el) => el.id === textInput.editingElementId)
      : null;

    const currentStrokeWidth = editingElement ? editingElement.strokeWidth : strokeWidth;
    const currentStrokeColor = editingElement ? editingElement.strokeColor : strokeColor;
    const fontSize = currentStrokeWidth * 12;
    const lines = textInput.text.split("\n");

    // Estimate width & height
    const longestLineLen = Math.max(...lines.map((l) => l.length));
    const width = longestLineLen * fontSize * 0.6;
    const height = lines.length * fontSize * 1.25;

    if (textInput.editingElementId) {
      // Update existing element
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== textInput.editingElementId) return el;
          const updated = {
            ...el,
            text: textInput.text,
            width,
            height,
          };
          broadcastAction({ type: "update", element: updated });
          return updated;
        })
      );
    } else {
      // Create new element
      const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newElement: CanvasElement = {
        id: newId,
        type: "text",
        x: textInput.x,
        y: textInput.y,
        width,
        height,
        text: textInput.text,
        strokeColor: currentStrokeColor,
        fillColor: "transparent",
        strokeWidth: currentStrokeWidth,
        strokeStyle: "solid",
      };

      setElements((prev) => [...prev, newElement]);
      setMyElements((prev) => [...prev, newElement.id]);
      broadcastAction({ type: "add", element: newElement });
    }
    setTextInput(null);
  };

  const updateSelectedElementStyle = (updates: Partial<CanvasElement>) => {
    if (selectedElementId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          const updated = { ...el, ...updates };

          if (el.type === "text" && updates.strokeWidth !== undefined) {
            const lines = el.text ? el.text.split("\n") : [""];
            const fontSize = updates.strokeWidth * 12;
            const lineHeight = fontSize * 1.25;
            const longestLine = lines.reduce(
              (longest, line) =>
                line.length > longest.length ? line : longest,
              "",
            );
            const estWidth = longestLine.length * (fontSize * 0.6);
            const estHeight = lines.length * lineHeight;
            updated.width = estWidth;
            updated.height = estHeight;
          }

          broadcastAction({ type: "update", element: updated });
          return updated;
        }),
      );
    }
  };

  // Sync sidebar styling states with the selected element on selection change
  useEffect(() => {
    if (selectedElementId) {
      const el = elements.find((e) => e.id === selectedElementId);
      if (el) {
        setStrokeColor(el.strokeColor);
        setFillColor(el.fillColor);
        setStrokeWidth(el.strokeWidth);
        setStrokeStyle(el.strokeStyle);
      }
    }
  }, [selectedElementId]);

  const pasteCanvasElement = (copiedEl: CanvasElement) => {
    const newId = `${copiedEl.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newElement: CanvasElement = {
      ...copiedEl,
      id: newId,
      x: copiedEl.x + 20,
      y: copiedEl.y + 20,
    };
    if (newElement.points) {
      newElement.points = newElement.points.map((p) => ({
        x: p.x + 20,
        y: p.y + 20,
      }));
    }

    setElements((prev) => [...prev, newElement]);
    setMyElements((prev) => [...prev, newId]);
    setSelectedElementId(newId);
    broadcastAction({ type: "add", element: newElement });
  };

  const compressAndPasteImage = (dataUrl: string) => {
    const tempImg = new Image();
    tempImg.src = dataUrl;
    tempImg.onload = () => {
      const maxDim = 800;
      let width = tempImg.width;
      let height = tempImg.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else {
          width = (width * maxDim) / height;
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(tempImg, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

      const canvasEl = canvasRef.current;
      let worldX = 100;
      let worldY = 100;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        worldX = (centerX - panRef.current.x) / zoomRef.current;
        worldY = (centerY - panRef.current.y) / zoomRef.current;
      }

      const displayWidth = Math.min(300, width);
      const displayHeight = displayWidth * (height / width);

      const newId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newElement: CanvasElement = {
        id: newId,
        type: "image",
        x: worldX - displayWidth / 2,
        y: worldY - displayHeight / 2,
        width: displayWidth,
        height: displayHeight,
        strokeColor: "#1E1E1E",
        fillColor: "transparent",
        strokeWidth: 1,
        strokeStyle: "solid",
        dataUrl: compressedDataUrl,
      };

      setElements((prev) => [...prev, newElement]);
      setMyElements((prev) => [...prev, newId]);
      setSelectedElementId(newId);
      broadcastAction({ type: "add", element: newElement });
    };
  };

  const pasteTextAsElement = (text: string) => {
    const canvasEl = canvasRef.current;
    let worldX = 100;
    let worldY = 100;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      worldX = (centerX - panRef.current.x) / zoomRef.current;
      worldY = (centerY - panRef.current.y) / zoomRef.current;
    }

    const lines = text.split("\n");
    const fontSize = strokeWidthRef.current * 12;
    const lineHeight = fontSize * 1.25;
    const longestLine = lines.reduce(
      (longest, line) => (line.length > longest.length ? line : longest),
      "",
    );
    const estWidth = longestLine.length * (fontSize * 0.6) + 20;
    const estHeight = lines.length * lineHeight + 20;

    const newId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newElement: CanvasElement = {
      id: newId,
      type: "text",
      x: worldX - estWidth / 2,
      y: worldY - estHeight / 2,
      width: estWidth,
      height: estHeight,
      text: text,
      strokeColor: strokeColorRef.current,
      fillColor: "transparent",
      strokeWidth: strokeWidthRef.current,
      strokeStyle: "solid",
    };

    setElements((prev) => [...prev, newElement]);
    setMyElements((prev) => [...prev, newId]);
    setSelectedElementId(newId);
    broadcastAction({ type: "add", element: newElement });
  };

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (selectedElementIdRef.current) {
        const el = elementsRef.current.find((item) => item.id === selectedElementIdRef.current);
        if (el) {
          e.preventDefault();
          const copyData = JSON.stringify({
            type: "scrawl-element",
            element: el,
          });
          e.clipboardData?.setData("text/plain", copyData);
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (dataUrl) {
                  compressAndPasteImage(dataUrl);
                }
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }
      }

      const text = e.clipboardData?.getData("text");
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.type === "scrawl-element" && parsed.element) {
            e.preventDefault();
            pasteCanvasElement(parsed.element);
            return;
          }
        } catch (err) {
          // Ignore, fallback to pasteTextAsElement
        }

        e.preventDefault();
        pasteTextAsElement(text);
      }
    };

    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const centerOnElement = (el: CanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenCenterX = rect.width / 2;
    const screenCenterY = rect.height / 2;
    
    const elCenterX = el.x + el.width / 2;
    const elCenterY = el.y + el.height / 2;
    
    setPan({
      x: screenCenterX - elCenterX * zoom,
      y: screenCenterY - elCenterY * zoom,
    });
  };

  const goToLastDrawnPlace = () => {
    if (elements.length === 0) return;
    const lastEl = elements[elements.length - 1];
    centerOnElement(lastEl);
  };

  // Undo / Redo logic
  const handleUndo = () => {
    if (myElements.length === 0) return;

    // Pop last item we added
    const newMyElements = [...myElements];
    const lastId = newMyElements.pop();
    if (!lastId) return;

    const itemToDelete = elements.find((e) => e.id === lastId);
    if (itemToDelete) {
      setRedoStack((r) => [...r, [itemToDelete]]);
      
      // Center on the remaining last element on canvas (if any exists)
      const remainingElements = elements.filter((e) => e.id !== lastId);
      if (remainingElements.length > 0) {
        const nextLastElement = remainingElements[remainingElements.length - 1];
        centerOnElement(nextLastElement);
      }
    }

    setMyElements(newMyElements);
    setElements((prev) => prev.filter((e) => e.id !== lastId));
    broadcastAction({ type: "delete", elementId: lastId });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextRedoStack = [...redoStack];
    const items = nextRedoStack.pop();
    if (!items || items.length === 0) return;

    setRedoStack(nextRedoStack);
    const item = items[0];

    setElements((prev) => [...prev, item]);
    setMyElements((prev) => [...prev, item.id]);
    broadcastAction({ type: "add", element: item });
  };

  useEffect(() => {
    handleUndoRef.current = handleUndo;
    handleRedoRef.current = handleRedo;
  });

  const handleClear = () => {
    if (
      window.confirm("Are you sure you want to clear the entire workspace?")
    ) {
      elements.forEach((el) => {
        broadcastAction({ type: "delete", elementId: el.id });
      });
      setElements([]);
      setMyElements([]);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  // Zoom helpers
  const adjustZoom = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.min(10, Math.max(0.1, currentZoom * factor));

    const worldX = (centerX - currentPan.x) / currentZoom;
    const worldY = (centerY - currentPan.y) / currentZoom;

    setZoom(newZoom);
    setPan({
      x: centerX - worldX * newZoom,
      y: centerY - worldY * newZoom,
    });
  };

  // Export canvas
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `scrawl-workspace-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-dvh overflow-hidden bg-[#FAF8F5] select-none flex flex-col"
    >
      {/* Canvas view */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Floating text edit area */}
      {textInput && (() => {
        const editingElement = textInput.editingElementId
          ? elements.find((el) => el.id === textInput.editingElementId)
          : null;
        const currentTextStrokeWidth = editingElement ? editingElement.strokeWidth : strokeWidth;
        const currentTextStrokeColor = editingElement ? editingElement.strokeColor : strokeColor;
        return (
          <div
            style={{
              position: "absolute",
              left: textInput.x * zoom + pan.x,
              top: textInput.y * zoom + pan.y,
              transform: "translate(-50%, -50%)",
              zIndex: 50,
            }}
            className="bg-transparent"
          >
            <textarea
              ref={textInputRef}
              className="bg-transparent border border-[#FAF8F5] outline-none text-[#1E1E1E] font-mono resize-none p-1"
              wrap="off"
              style={{
                fontSize: `${currentTextStrokeWidth * 12 * zoom}px`,
                lineHeight: 1.25,
                color: currentTextStrokeColor,
                width: `${Math.max(
                  250,
                  textInput.text
                    .split("\n")
                    .reduce((max, line) => Math.max(max, line.length), 0) *
                    (currentTextStrokeWidth * 12 * 0.6) *
                    zoom +
                    30,
                )}px`,
                height: `${Math.max(
                  100,
                  textInput.text.split("\n").length *
                    (currentTextStrokeWidth * 12 * 1.25) *
                    zoom +
                    30,
                )}px`,
              }}
              value={textInput.text}
              onChange={(e) =>
                setTextInput({ ...textInput, text: e.target.value })
              }
              onBlur={commitTextInput}
              placeholder="Type drawing text..."
            />
          </div>
        );
      })()}

      {/* Toolbar - Floating bottom */}
      <div className="absolute bottom-6 md:bottom-4 left-0 right-0 z-10 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center h-8.5 gap-0.5 md:gap-1 bg-[#FAF8F5] border border-[#E5E0D8] px-1 rounded-xl shadow-[0_4px_16px_rgba(229,224,216,0.3)] max-w-full overflow-x-auto scrollbar-none whitespace-nowrap pointer-events-auto">
          {[
            { id: "select", icon: MousePointer, label: "Select (V)" },
            { id: "hand", icon: Hand, label: "Pan (H)" },
            { id: "rect", icon: Square, label: "Rectangle (R)" },
            { id: "ellipse", icon: Circle, label: "Circle (O)" },
            { id: "triangle", icon: Triangle, label: "Triangle (I)" },
            { id: "rhombus", icon: Diamond, label: "Rhombus (G)" },
            { id: "line", icon: Minus, label: "Line (L)" },
            { id: "arrow", icon: ArrowRight, label: "Arrow (A)" },
            { id: "pencil", icon: Pencil, label: "Pencil (P)" },
            { id: "text", icon: Type, label: "Text (T)" },
            { id: "eraser", icon: Eraser, label: "Eraser (E)" },
          ]
            .filter((t) => !isReadOnly || t.id === "select" || t.id === "hand")
            .map((t) => {
              const IconComp = t.icon;
              const isActive = tool === t.id;
              return (
                <Button
                  key={t.id}
                  variant={isActive ? "active" : "ghost"}
                  size="icon"
                  className="relative group transition-all !h-7 !w-7"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTool(t.id as Tool);
                    setSelectedElementId(null);
                  }}
                  title={t.label}
                >
                  <IconComp className="h-[14px] w-[14px]" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#1E1E1E] text-white text-[10px] py-1 px-2 rounded whitespace-nowrap font-mono">
                    {t.label}
                  </span>
                </Button>
              );
            })}
        </div>
      </div>

      {/* Top Left Navigation & Styles Toggle */}
      <div className="absolute top-6 left-6 z-20 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-1 font-mono text-[10px] h-7 px-2 shadow-sm bg-white"
        >
          <Home className="h-[14px] w-[14px]" />
          <span className="hidden sm:inline">HOME</span>
        </Button>

        {!isReadOnly && (
          <Button
            variant={showMobileStyles ? "active" : "secondary"}
            size="sm"
            onClick={() => setShowMobileStyles(!showMobileStyles)}
            className="md:hidden flex items-center gap-1 font-mono text-[10px] h-7 px-2 bg-white"
          >
            <Sparkles className="h-[14px] w-[14px] text-[#D95F4D]" />
            Styles
          </Button>
        )}
      </div>

      {/* Read-Only archive indicator */}
      {isReadOnly && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-[#FAF8F5]/90 border border-[#E5E0D8] px-4 py-2 rounded-full font-mono text-[10px] font-bold tracking-wider text-[#A19D94] shadow-sm select-none">
          VIEW ONLY MODE
        </div>
      )}

      {/* Styles sidebar - Floating left */}
      {!isReadOnly && (
        <div
          className={`absolute top-20 left-6 z-10 flex flex-col gap-3 bg-[#FAF8F5] border border-[#E5E0D8] px-2.5 py-3 rounded-xl shadow-[0_4px_16px_rgba(229,224,216,0.3)] w-40 transition-all ${
            showMobileStyles ? "flex" : "hidden md:flex"
          }`}
        >
          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] mb-2">
              Stroke Color
            </h4>
            <div className="grid grid-cols-5 gap-1">
              {[
                "#1E1E1E", // black
                "#706B5F", // gray
                "#E03131", // red
                "#1971C2", // blue
                "#2F9E44", // green
                "#E8590C", // orange
                "#9C36B5", // purple
                "#D6336C", // pink
              ].map((col) => (
                <button
                  key={col}
                  className={`w-6 h-6 rounded-md border transition-all ${
                    strokeColor === col
                      ? "ring-2 ring-[#D95F4D] scale-110"
                      : "border-[#E5E0D8]"
                  }`}
                  style={{ backgroundColor: col }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setStrokeColor(col);
                    updateSelectedElementStyle({ strokeColor: col });
                    if (tool === "eraser") {
                      setTool("pencil");
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] mb-2">
              Fill Color
            </h4>
            <div className="grid grid-cols-5 gap-1">
              {[
                "transparent",
                "#FFFFFF", // white
                "#E03131", // red
                "#1971C2", // blue
                "#2F9E44", // green
                "#E8590C", // orange
                "#9C36B5", // purple
                "#D6336C", // pink
              ].map((col) => (
                <button
                  key={col}
                  className={`w-6 h-6 rounded-md border relative transition-all ${
                    fillColor === col
                      ? "ring-2 ring-[#D95F4D] scale-110"
                      : "border-[#E5E0D8]"
                  }`}
                  style={{
                    backgroundColor: col === "transparent" ? "white" : col,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFillColor(col);
                    updateSelectedElementStyle({ fillColor: col });
                    if (tool === "eraser") {
                      setTool("pencil");
                    }
                  }}
                >
                  {col === "transparent" && (
                    <span className="absolute inset-0 flex items-center justify-center text-[#A19D94] text-xs">
                      /
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] mb-2">
              Stroke Width
            </h4>
            <div className="flex gap-1.5">
              {[1, 2, 4, 6].map((w, idx) => (
                <Button
                  key={w}
                  variant={strokeWidth === w ? "active" : "secondary"}
                  size="sm"
                  className="flex-1 text-[10px] h-6.5 !px-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setStrokeWidth(w);
                    updateSelectedElementStyle({ strokeWidth: w });
                  }}
                >
                  {["S", "M", "L", "XL"][idx]}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] mb-2">
              Stroke Style
            </h4>
            <div className="flex gap-1.5">
              {(["solid", "dashed"] as const).map((style) => (
                <Button
                  key={style}
                  variant={strokeStyle === style ? "active" : "secondary"}
                  size="sm"
                  className="flex-1 text-[10px] h-6.5 capitalize !px-1"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setStrokeStyle(style);
                    updateSelectedElementStyle({ strokeStyle: style });
                  }}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] mb-2">
              Rough wobble Mode
            </h4>
            <Button
              variant={roughMode ? "active" : "secondary"}
              size="sm"
              className="w-full flex items-center justify-center gap-1 text-[10px] h-6.5"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setRoughMode(!roughMode)}
            >
              <Sparkles className="h-3 w-3 text-[#D95F4D]" />
              {roughMode ? "Rough Wobble: ON" : "Perfect Vector: ON"}
            </Button>
          </div>
        </div>
      )}

      {/* Control Actions - Floating right top */}
      <div className="absolute top-6 right-6 z-10 flex gap-1">
        {!isReadOnly && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="!h-7 !w-7 shadow-sm bg-white"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUndo}
              disabled={myElements.length === 0}
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 className="h-[14px] w-[14px]" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="!h-7 !w-7 shadow-sm bg-white"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo action (Ctrl+Y)"
            >
              <Redo2 className="h-[14px] w-[14px]" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="!h-7 !w-7 shadow-sm bg-white"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              title="Clear canvas"
            >
              <Trash2 className="h-[14px] w-[14px] text-[#D95F4D]" />
            </Button>
          </>
        )}
        {roomId !== "guest" && (
          <Button
            variant="secondary"
            size="icon"
            className="!h-7 !w-7 shadow-sm bg-white"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleExport}
            title="Export as PNG image"
          >
            <Download className="h-[14px] w-[14px]" />
          </Button>
        )}
        {!isReadOnly && roomSlug && roomId !== "guest" && (
          <Button
            variant="secondary"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsShareModalOpen(true)}
            title="Share canvas workspace"
            className="flex items-center gap-1 h-7 font-mono text-[10px] font-bold bg-white px-2"
          >
            <Share2 className="h-[14px] w-[14px] text-[#D95F4D]" />
            <span className="hidden sm:inline">
              SHARE
            </span>
          </Button>
        )}
      </div>

      <div className="absolute bottom-24 left-6 md:bottom-6 md:left-6 z-10 flex items-center h-8.5 gap-0.5 bg-[#FAF8F5] border border-[#E5E0D8] px-1 rounded-lg shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => adjustZoom(0.8)}
          className="!h-7 !w-7"
          disabled={isCanvasLocked}
          title="Zoom Out"
        >
          <ZoomOut className="h-[14px] w-[14px]" />
        </Button>
        <span className="text-[10px] font-mono font-semibold px-0.5 w-10 text-center text-[#1E1E1E]">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => adjustZoom(1.2)}
          className="!h-7 !w-7"
          disabled={isCanvasLocked}
          title="Zoom In"
        >
          <ZoomIn className="h-[14px] w-[14px]" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] px-1.5 h-7 font-semibold text-[#D95F4D]"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          disabled={isCanvasLocked}
        >
          Reset
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="!h-7 !w-7 transition-colors text-[#706B5F] hover:text-[#D95F4D]"
          onMouseDown={(e) => e.preventDefault()}
          onClick={goToLastDrawnPlace}
          disabled={isCanvasLocked || elements.length === 0}
          title="Center on last drawn element"
        >
          <Locate className="h-[14px] w-[14px]" />
        </Button>
        <div className="w-px h-3 bg-[#E5E0D8]" />
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsCanvasLocked(!isCanvasLocked)}
          className={`!h-7 !w-7 transition-colors ${
            isCanvasLocked ? "text-[#D95F4D]" : "text-[#706B5F]"
          }`}
          title={
            isCanvasLocked ? "Unlock infinite canvas" : "Lock infinite canvas"
          }
        >
          {isCanvasLocked ? (
            <Lock className="h-[14px] w-[14px]" />
          ) : (
            <Unlock className="h-[14px] w-[14px]" />
          )}
        </Button>
      </div>

      {/* Share modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-[#1E1E1E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-2xl p-6 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-extrabold mb-2">Share Workspace</h3>
            <p className="text-xs text-[#706B5F] mb-6">
              Share links to view or edit this workspace. Keep the edit link
              private.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] block mb-1.5">
                  Edit Link (Allows drawing & updates)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/canvas/${roomSlug}`
                        : ""
                    }
                    className="flex-1 rounded-md border border-[#E5E0D8] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1E1E1E] focus:outline-none"
                  />
                  <Button
                    variant="secondary"
                    className="text-xs py-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/canvas/${roomSlug}`,
                      );
                      setCopiedEdit(true);
                      setTimeout(() => setCopiedEdit(false), 2000);
                    }}
                  >
                    {copiedEdit ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] block mb-1.5">
                  Read-Only Link (Allows viewing only)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/canvas/${roomId}`
                        : ""
                    }
                    className="flex-1 rounded-md border border-[#E5E0D8] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1E1E1E] focus:outline-none"
                  />
                  <Button
                    variant="secondary"
                    className="text-xs py-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/canvas/${roomId}`,
                      );
                      setCopiedRead(true);
                      setTimeout(() => setCopiedRead(false), 2000);
                    }}
                  >
                    {copiedRead ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsShareModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
