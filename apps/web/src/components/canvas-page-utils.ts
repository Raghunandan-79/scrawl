import { CanvasElement, DEFAULT_PAGE_TITLE, DEFAULT_PAGE_ICON } from "./canvas-types";

/**
 * Sanitizes a page title to guarantee it contains no numbers (0-9).
 * If the resulting title is empty, falls back to DEFAULT_PAGE_TITLE ("Page").
 */
export function sanitizePageTitle(title?: string | null): string {
  if (!title) return DEFAULT_PAGE_TITLE;
  const noNumbers = title.replace(/[0-9]/g, "").trim();
  return noNumbers || DEFAULT_PAGE_TITLE;
}

/**
 * Extracts the first word from typed text without any numbers (0-9).
 * - Ignores tokens that are purely numbers or ordinals (e.g. "1.", "1st", "2024").
 * - Strips all digits from the chosen word (e.g. "Sprint2024" -> "Sprint").
 * - Trims non-alphabetic/punctuation wrappers (e.g. "#Architecture:" -> "Architecture").
 * - Capitalizes the first letter of the result.
 * - Guarantees NO numbers exist in the returned string.
 */
export function extractFirstWordWithoutNumbers(text?: string | null): string | null {
  if (!text || !text.trim()) return null;

  // Split into tokens separated by whitespace
  const tokens = text.trim().split(/\s+/);

  for (const rawToken of tokens) {
    // 1. Check if token is an ordinal number like "1st", "2nd", "3rd", "4th"
    const isOrdinal = /^\d+(st|nd|rd|th)$/i.test(
      rawToken.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ""),
    );
    if (isOrdinal) {
      continue;
    }

    // 2. Remove all numbers / digits (0-9)
    const tokenNoDigits = rawToken.replace(/[0-9]/g, "");

    // 3. Trim leading and trailing punctuation, quotes, brackets, symbols
    const cleaned = tokenNoDigits.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

    // 4. Skip if the remaining string is just a leftover ordinal suffix without its number
    if (/^(st|nd|rd|th)$/i.test(cleaned)) {
      continue;
    }

    // 5. Must contain at least one valid letter and absolutely no digits
    if (cleaned.length > 0 && /\p{L}/u.test(cleaned) && !/[0-9]/.test(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  return null;
}

/**
 * Returns a human-friendly name for a drawn shape / element.
 * Guarantees no numbers are present.
 */
export function getDrawingName(type: CanvasElement["type"]): string {
  switch (type) {
    case "rect":
      return "Rectangle";
    case "ellipse":
      return "Circle";
    case "triangle":
      return "Triangle";
    case "rhombus":
      return "Rhombus";
    case "line":
      return "Line";
    case "arrow":
      return "Arrow";
    case "pencil":
      return "Drawing";
    case "image":
      return "Image";
    default:
      return "Drawing";
  }
}

/**
 * Returns an appropriate icon for a canvas element type.
 */
export function getDrawingIcon(type: CanvasElement["type"]): string {
  switch (type) {
    case "rect":
      return "🟩";
    case "ellipse":
      return "⚪";
    case "triangle":
      return "🔺";
    case "rhombus":
      return "🔶";
    case "line":
      return "➖";
    case "arrow":
      return "➡️";
    case "pencil":
      return "✏️";
    case "image":
      return "🖼️";
    case "text":
      return "📝";
    default:
      return DEFAULT_PAGE_ICON;
  }
}

/**
 * Determines the page name and icon automatically based on page content:
 * 1. If text is typed or exists on the page, derives title from the first word (no numbers).
 * 2. If drawings exist without text, derives title from what was drawn (e.g. "Rectangle", "Circle").
 * 3. Guarantees the resulting title never contains any number.
 */
export function getAutoPageName(
  pageElements: CanvasElement[],
  activeTextInput?: string | null,
): { title: string; icon: string } | null {
  // 1. Check active text input if currently being typed
  if (activeTextInput && activeTextInput.trim()) {
    const word = extractFirstWordWithoutNumbers(activeTextInput);
    if (word) {
      return { title: sanitizePageTitle(word), icon: "📝" };
    }
  }

  // 2. Check committed text elements on this page (first text element)
  const textElements = pageElements.filter(
    (el) => el.type === "text" && el.text && el.text.trim(),
  );
  for (const textEl of textElements) {
    const word = extractFirstWordWithoutNumbers(textEl.text);
    if (word) {
      return { title: sanitizePageTitle(word), icon: "📝" };
    }
  }

  // 3. Check drawing elements on this page (first drawn shape or sketch)
  const drawingElement = pageElements.find(
    (el) => el.type !== "text" && el.type !== "eraser",
  );
  if (drawingElement) {
    const name = getDrawingName(drawingElement.type);
    return {
      title: sanitizePageTitle(name),
      icon: getDrawingIcon(drawingElement.type),
    };
  }

  return null;
}
