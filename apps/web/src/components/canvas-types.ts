export type Tool =
  | "select"
  | "hand"
  | "pencil"
  | "rect"
  | "ellipse"
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
  type: "rect" | "ellipse" | "line" | "arrow" | "pencil" | "text";
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
}

export type ActionType = "add" | "update" | "delete";

export interface CanvasAction {
  type: ActionType;
  elementId?: string; // used for delete
  element?: CanvasElement; // used for add, update
}
