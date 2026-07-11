# Scrawl Whiteboard Application

Scrawl is a lightweight, responsive digital whiteboard application (similar to Excalidraw or tldraw) designed for creative, collaborative brainstorming.

## 🚀 Features

- **Freeform Vector Canvas**: Draw rectangles, ellipses, lines, arrows, freehand lines (pencil), and text with customizable colors and widths.
- **Wobbly Rough Mode**: A hand-drawn aesthetic option to give your diagrams a warm, organic look.
- **Infinite Pan & Zoom**: Move around the canvas freely or zoom in/out dynamically.
- **Auto-scroll on Drag**: Panning automatically scrolls when your cursor approaches the edge of the viewport during drawing.
- **Collaboration Mode**:
  - **Edit Link**: Share the unguessable slug (e.g. `/canvas/rm-wpgtg1dr`) with partners to co-create.
  - **Read-Only Link**: Share public numeric room IDs (e.g. `/canvas/12`) to view the canvas securely.
- **History Control**: Fully functional Undo/Redo/Clear options synced in real-time.
- **Local PNG Export**: Download your canvas creations instantly.

## 🛠️ Architecture (Monorepo)

This project is built using a pnpm monorepo structure:
- **`apps/scrawl-frontend`**: Next.js (TypeScript, Tailwind CSS)
- **`apps/http-backend`**: Express API (Database room management, CORS, user authentication)
- **`apps/ws-backend`**: Node.js WebSocket Server (State synchronization, connection cleanup)
- **`packages/db`**: Prisma with PostgreSQL client pooling.
- **`packages/ui`**: Shared, responsive UI component library.
