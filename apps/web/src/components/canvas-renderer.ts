import { CanvasElement } from "./canvas-types";

// Seeded random number generator to make rough mode drawings stable across frames
function createSeededRandom(seedString: string) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = (Math.imul(31, h) + seedString.charCodeAt(i)) | 0;
  }
  return function () {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper to draw wobbly sketch-like line
export function drawWobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  random: () => number = Math.random,
) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 1) return;

  const deviation = Math.min(2.5, length * 0.03);

  const drawStroke = (offset: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const nx = -dy / length;
    const ny = dx / length;

    // Add wobbly curve
    const dev = (random() - 0.5) * deviation + offset;
    const cx = mx + nx * dev;
    const cy = my + ny * dev;

    ctx.quadraticCurveTo(
      cx,
      cy,
      x2 + (random() - 0.5) * offset * 0.3,
      y2 + (random() - 0.5) * offset * 0.3,
    );
    ctx.stroke();
  };

  drawStroke(0.4);
  drawStroke(-0.4);
}

// Helper to draw wobbly sketch-like ellipse
export function drawWobblyEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  random: () => number = Math.random,
) {
  const steps = 24;
  const deviation = Math.min(2.0, Math.min(rx, ry) * 0.06 || 1);

  const drawStroke = (offset: number) => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dev = (random() - 0.5) * deviation + offset;
      const x = cx + (rx + dev) * Math.cos(angle);
      const y = cy + (ry + dev) * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  drawStroke(0.3);
  drawStroke(-0.3);
}

const imageCache: Record<string, HTMLImageElement> = {};

export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  roughMode: boolean = true,
  zoom: number = 1,
  onImageLoaded?: () => void,
) {
  const seedString = element.id || `${element.x}-${element.y}`;
  const random = createSeededRandom(seedString);

  ctx.save();

  // Setup styles
  ctx.strokeStyle = element.strokeColor;
  // Ensure stroke width doesn't fall below a visible threshold in screen space when zoomed out
  const minWidth = 0.5 / zoom;
  ctx.lineWidth = Math.max(element.strokeWidth, minWidth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (element.strokeStyle === "dashed") {
    ctx.setLineDash([8 / zoom, 8 / zoom]);
  } else {
    ctx.setLineDash([]);
  }

  // Draw Fill (if active and shape type supports fill)
  const hasFill = element.fillColor !== "transparent";
  if (
    hasFill &&
    (element.type === "rect" ||
      element.type === "ellipse" ||
      element.type === "triangle" ||
      element.type === "rhombus")
  ) {
    ctx.fillStyle = element.fillColor;
    ctx.beginPath();
    if (element.type === "rect") {
      ctx.rect(element.x, element.y, element.width, element.height);
    } else if (element.type === "ellipse") {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      const rx = Math.abs(element.width / 2);
      const ry = Math.abs(element.height / 2);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (element.type === "triangle") {
      ctx.moveTo(element.x + element.width / 2, element.y);
      ctx.lineTo(element.x, element.y + element.height);
      ctx.lineTo(element.x + element.width, element.y + element.height);
      ctx.closePath();
    } else if (element.type === "rhombus") {
      ctx.moveTo(element.x + element.width / 2, element.y);
      ctx.lineTo(element.x + element.width, element.y + element.height / 2);
      ctx.lineTo(element.x + element.width / 2, element.y + element.height);
      ctx.lineTo(element.x, element.y + element.height / 2);
      ctx.closePath();
    }
    ctx.fill();
  }

  // Draw Strokes
  switch (element.type) {
    case "rect": {
      if (roughMode) {
        const x1 = element.x;
        const y1 = element.y;
        const x2 = element.x + element.width;
        const y2 = element.y + element.height;
        drawWobblyLine(ctx, x1, y1, x2, y1, random);
        drawWobblyLine(ctx, x2, y1, x2, y2, random);
        drawWobblyLine(ctx, x2, y2, x1, y2, random);
        drawWobblyLine(ctx, x1, y2, x1, y1, random);
      } else {
        ctx.beginPath();
        ctx.rect(element.x, element.y, element.width, element.height);
        ctx.stroke();
      }
      break;
    }

    case "ellipse": {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      const rx = Math.abs(element.width / 2);
      const ry = Math.abs(element.height / 2);

      if (roughMode && rx > 2 && ry > 2) {
        drawWobblyEllipse(ctx, cx, cy, rx, ry, random);
      } else {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case "triangle": {
      const tx = element.x + element.width / 2;
      const ty = element.y;
      const blx = element.x;
      const bly = element.y + element.height;
      const brx = element.x + element.width;
      const bry = element.y + element.height;

      if (roughMode) {
        drawWobblyLine(ctx, tx, ty, blx, bly, random);
        drawWobblyLine(ctx, blx, bly, brx, bry, random);
        drawWobblyLine(ctx, brx, bry, tx, ty, random);
      } else {
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(blx, bly);
        ctx.lineTo(brx, bry);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    case "rhombus": {
      const topX = element.x + element.width / 2;
      const topY = element.y;
      const rightX = element.x + element.width;
      const rightY = element.y + element.height / 2;
      const bottomX = element.x + element.width / 2;
      const bottomY = element.y + element.height;
      const leftX = element.x;
      const leftY = element.y + element.height / 2;

      if (roughMode) {
        drawWobblyLine(ctx, topX, topY, rightX, rightY, random);
        drawWobblyLine(ctx, rightX, rightY, bottomX, bottomY, random);
        drawWobblyLine(ctx, bottomX, bottomY, leftX, leftY, random);
        drawWobblyLine(ctx, leftX, leftY, topX, topY, random);
      } else {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(rightX, rightY);
        ctx.lineTo(bottomX, bottomY);
        ctx.lineTo(leftX, leftY);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    case "line": {
      const x1 = element.x;
      const y1 = element.y;
      const x2 = element.x + element.width;
      const y2 = element.y + element.height;

      if (roughMode) {
        drawWobblyLine(ctx, x1, y1, x2, y2, random);
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    }

    case "arrow": {
      const x1 = element.x;
      const y1 = element.y;
      const x2 = element.x + element.width;
      const y2 = element.y + element.height;

      if (roughMode) {
        drawWobblyLine(ctx, x1, y1, x2, y2, random);
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Arrowhead calculations
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(10, element.strokeWidth * 3);
      const xHead1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
      const yHead1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
      const xHead2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
      const yHead2 = y2 - headLen * Math.sin(angle + Math.PI / 6);

      if (roughMode) {
        drawWobblyLine(ctx, x2, y2, xHead1, yHead1, random);
        drawWobblyLine(ctx, x2, y2, xHead2, yHead2, random);
      } else {
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(xHead1, yHead1);
        ctx.moveTo(x2, y2);
        ctx.lineTo(xHead2, yHead2);
        ctx.stroke();
      }
      break;
    }

    case "pencil": {
      if (!element.points || element.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(element.points[0].x, element.points[0].y);

      for (let i = 1; i < element.points.length; i++) {
        // Draw quadratic curves between points for smooth stroke
        const xc = (element.points[i].x + element.points[i - 1].x) / 2;
        const yc = (element.points[i].y + element.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(
          element.points[i - 1].x,
          element.points[i - 1].y,
          xc,
          yc,
        );
      }

      ctx.stroke();
      break;
    }

    case "text": {
      if (!element.text) return;
      // Use clean fonts (serif/sans/mono) depending on style
      const sizeStr = `${Math.max(12, element.strokeWidth * 12)}px`;
      ctx.font = `500 ${sizeStr} "Geist Mono", ui-monospace, monospace`;
      ctx.fillStyle = element.strokeColor;
      ctx.textBaseline = "top";

      // Split text by lines to support multi-line text input
      const lines = element.text.split("\n");
      const lineHeight = Math.max(12, element.strokeWidth * 12) * 1.25;
      lines.forEach((line, idx) => {
        ctx.fillText(line, element.x, element.y + idx * lineHeight);
      });
      break;
    }

    case "image": {
      if (!element.dataUrl) break;
      let img = imageCache[element.dataUrl];
      if (!img) {
        img = new Image();
        img.src = element.dataUrl;
        img.onload = () => {
          imageCache[element.dataUrl!] = img;
          if (onImageLoaded) {
            onImageLoaded();
          }
        };
      }

      if (!img || !img.complete) {
        ctx.save();
        ctx.strokeStyle = "#C4C0B5";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = "#A19D94";
        ctx.font = "12px sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("Loading...", element.x + 8, element.y + 8);
        ctx.restore();
      } else {
        ctx.drawImage(img, element.x, element.y, element.width, element.height);
      }
      break;
    }
  }

  ctx.restore();
}
