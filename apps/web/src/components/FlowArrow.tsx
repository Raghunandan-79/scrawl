import React, { useEffect, useRef } from "react";
import { CanvasElement } from "./canvas-types";

interface FlowArrowProps {
  element: CanvasElement;
  isAnimating: boolean;
}

export function FlowArrow({ element, isAnimating }: FlowArrowProps) {
  const dot1Ref = useRef<SVGCircleElement>(null);
  const dot2Ref = useRef<SVGCircleElement>(null);
  const dot3Ref = useRef<SVGCircleElement>(null);

  const animsRef = useRef<Animation[]>([]);

  const x1 = element.x;
  const y1 = element.y;
  const x2 = element.x + element.width;
  const y2 = element.y + element.height;
  const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;

  useEffect(() => {
    // Clean up existing animations
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];

    const dots = [dot1Ref.current, dot2Ref.current, dot3Ref.current];
    const duration = 2000;

    dots.forEach((dot, index) => {
      if (!dot) return;
      const delay = (duration / dots.length) * index;

      try {
        const anim = dot.animate(
          [{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
          {
            duration,
            iterations: Infinity,
            delay,
            easing: "linear",
          },
        );

        animsRef.current.push(anim);

        if (!isAnimating) {
          anim.pause();
        }
      } catch (err) {
        console.error("Failed to animate dot", err);
      }
    });

    return () => {
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
    };
  }, [pathD, isAnimating]);

  // Handle play/pause toggle dynamically without recreating the Web Animation instance
  useEffect(() => {
    animsRef.current.forEach((anim) => {
      try {
        if (isAnimating) {
          if (anim.playState === "paused") {
            anim.play();
          }
        } else {
          if (anim.playState !== "paused") {
            anim.pause();
          }
        }
      } catch (e) {
        console.error("Error toggling animation play/pause state:", e);
      }
    });
  }, [isAnimating]);

  const length = Math.hypot(element.width, element.height);
  if (length < 10) {
    return null; // Don't animate tiny lines or clicks
  }

  const dotRadius = Math.max(3, element.strokeWidth * 0.8);

  return (
    <g>
      <circle
        ref={dot1Ref}
        r={dotRadius}
        fill={element.strokeColor}
        style={{
          offsetPath: `path('${pathD}')`,
          offsetRotate: "auto",
          position: "absolute",
          transformOrigin: "center",
          opacity: isAnimating ? 0.85 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      <circle
        ref={dot2Ref}
        r={dotRadius}
        fill={element.strokeColor}
        style={{
          offsetPath: `path('${pathD}')`,
          offsetRotate: "auto",
          position: "absolute",
          transformOrigin: "center",
          opacity: isAnimating ? 0.85 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      <circle
        ref={dot3Ref}
        r={dotRadius}
        fill={element.strokeColor}
        style={{
          offsetPath: `path('${pathD}')`,
          offsetRotate: "auto",
          position: "absolute",
          transformOrigin: "center",
          opacity: isAnimating ? 0.85 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </g>
  );
}
