export type Tool =
  | "select"
  | "hand"
  | "pencil"
  | "rect"
  | "ellipse"
  | "triangle"
  | "rhombus"
  | "line"
  | "arrow"
  | "text"
  | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type:
    | "rect"
    | "ellipse"
    | "triangle"
    | "rhombus"
    | "line"
    | "arrow"
    | "pencil"
    | "text"
    | "image"
    | "eraser";
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  text?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  dataUrl?: string;
  pageId?: string;
}

export interface CanvasPage {
  id: string;
  title: string;
  icon?: string;
  createdAt: number;
  updatedAt?: number;
  isCustomTitle?: boolean;
}

export const DEFAULT_PAGE_ID = "page-default";
export const DEFAULT_PAGE_TITLE = "Page";
export const DEFAULT_PAGE_ICON = "📄";

export type ActionType =
  | "add"
  | "update"
  | "delete"
  | "page_create"
  | "page_update"
  | "page_delete"
  | "page_duplicate";

export interface CanvasAction {
  type: ActionType;
  elementId?: string; // used for delete
  element?: CanvasElement; // used for add, update
  pageId?: string;
  page?: CanvasPage; // used for page_create, page_update
  sourcePageId?: string; // used for page_duplicate
  newPage?: CanvasPage; // used for page_duplicate
  elements?: CanvasElement[]; // used for page_duplicate
}
