# Scrawl Whiteboard Application

Scrawl is a lightweight, high-performance, real-time collaborative digital whiteboard application (similar to Excalidraw or tldraw) designed for creative, collaborative brainstorming.

---

## 🚀 Features

- **Freeform Vector Canvas**: Draw rectangles, ellipses, lines, arrows, freehand lines (pencil), and text with customizable colors and stroke styles.
- **Wobbly Rough Mode**: A hand-drawn aesthetic option (powered by RoughJS) to give your diagrams a warm, organic look.
- **Infinite Pan & Zoom**: Move around the canvas freely or zoom in/out dynamically.
- **Real-Time Collaboration**:
  - **Shared Live Cursors**: See collaborator cursors with colored badges and usernames in real-time.
  - **Slug/Room Linking**: Share unguessable slugs (e.g. `/canvas/rm-wpgtg1dr`) to co-create with editing rights.
- **Guest Workspace Mode**: Draw on the canvas without creating an account (saved to `localStorage` under a single guest canvas layout; share/export actions are disabled).
- **Mobile & Tablet Touch Controls**: Native touch support including drawing, panning, and two-finger focal pinch-to-zoom.
- **High-DPI Razor-Sharp Rendering**: Automatic pixel density adjustment (`devicePixelRatio`) to keep drawings crisp on Retina screens and iPads.
- **History Control**: Fully functional Undo, Redo, and Clear options synced across all connected clients.
- **Local PNG Export**: Download canvas creations instantly.
- **SEO-Optimized Server Landing Page**: Next.js Server Component architecture for the main root layout (`/`), exporting static SEO metadata tags while modularizing dynamic/stateful logic inside interactive client modules.
- **Eye-Soothing Colors**: Solid but muted color palette (Charcoal, Slate Gray, Ruby Red, Ocean Blue, Forest Green, Terracotta Orange, Plum Purple, and Rose Pink) built to minimize eye strain during long whiteboard sessions.

---

## 🛠️ Architecture (Monorepo)

This project is built as a TypeScript Turborepo monorepo:

- **`apps/web`**: Next.js App Router (TypeScript, Tailwind CSS) for landing page, auth, and canvas interface.
- **`apps/http-backend`**: Express API handling user auth, database room management, and CORS routing.
- **`apps/ws-backend`**: Node.js WebSocket Server managing real-time cursor broadcasting and drawing synchronization.
- **`packages/db`**: Prisma Client with PostgreSQL connection pooling.
- **`packages/ui`**: Shared React UI library (buttons, inputs, layouts).
- **`packages/common`**: Shared TypeScript types and Zod schemas for input validation.

---

# 📐 Low-Level Design (LLD) Document

This section details the design patterns, network models, data structures, and pipeline protocols implemented in Scrawl.

## 1. System Topology & Architecture

The following diagram illustrates how clients connect to the HTTP server for authentication and REST APIs, while using persistent WebSockets for live drawing synchronization and cursor broadcasting:

```mermaid
graph TD
    Client1[Next.js Client A] <-->|HTTPS Rest APIs| HTTP[HTTP Express Backend]
    Client2[Next.js Client B] <-->|HTTPS Rest APIs| HTTP

    Client1 <-->|WSS Events| WS[WebSocket Backend]
    Client2 <-->|WSS Events| WS

    HTTP <-->|Prisma ORM| DB[(PostgreSQL Database)]
    WS <-->|Prisma ORM| DB
```

---

## 2. WebSocket Protocol & Message Flow

Real-time interactions are divided into two lanes: **persistent events** (drawing elements) which write to the database, and **ephemeral events** (live cursor movements) which bypass database writes entirely to avoid network bottlenecks.

```mermaid
sequenceDiagram
    autonumber
    actor Client A
    participant WS Server
    participant Database
    actor Client B

    Client A->>WS Server: type: "join_room" (roomId, token)
    WS Server->>Database: Verify JWT Token & Room membership
    Database-->>WS Server: User Info & Join Approved
    WS Server-->>Client A: Joined Successfully

    rect rgb(240, 245, 255)
        Note over Client A, Client B: Ephemeral Cursor Broadcast (No DB write)
        Client A->>WS Server: type: "cursor_move" (x, y, roomId)
        WS Server-->>Client B: Broadcast cursor_move (x, y, userName)
    end

    rect rgb(245, 240, 245)
        Note over Client A, Database: Persistent Drawing Event
        Client A->>WS Server: type: "chat" (action: "add", element)
        WS Server->>Database: Prisma chat.create() (Persist element)
        WS Server-->>Client B: Broadcast chat event (Action/Element details)
    end
```

### WebSocket Message Schemas

#### Client to Server

```typescript
// Joining a room
{ "type": "join_room", "roomId": "123", "token": "JWT_TOKEN" }

// Broadcast cursor coordinates
{ "type": "cursor_move", "roomId": "123", "x": 140.2, "y": -80.5 }

// Drawing actions (adds, updates, deletes)
{
  "type": "chat",
  "roomId": "123",
  "message": "{\"action\":\"add\",\"element\":{...}}"
}
```

---

## 3. Database Schema

We use Prisma with PostgreSQL. Drawings are stored in the `Chat` table as JSON elements mapped to a specific `Room`.

```prisma
model User {
  id       String @id @default(uuid())
  email    String @unique
  username String @unique
  name     String
  password String
  rooms    Room[]
  chats    Chat[]
}

model Room {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  createdAt DateTime @default(now())
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id])
  chats     Chat[]
}

model Chat {
  id        Int      @id @default(autoincrement())
  roomId    Int
  message   String   // Stores stringified CanvasElement JSON
  userId    String
  room      Room     @relation(fields: [roomId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 4. Graphics & Canvas Pipeline

### 4.1 Input Mapping (Mouse vs. Touch)

To ensure drawing, selecting, and panning work flawlessly on both desktops and mobile devices, we map mouse and touch event pointers to a unified coordinate-processing pipeline:

```typescript
// Unified start handler
const handleStart = (clientX: number, clientY: number) => {
  // Convert screen space pixels to canvas world coordinates
  const worldPos = screenToWorld(clientX, clientY);
  setIsDrawing(true);
  setStartPoint(worldPos);
  // Shape creation/eraser/selection logic...
};

// Bound listeners
canvas.addEventListener("touchstart", onTouchStart, { passive: false });
canvas.addEventListener("touchmove", onTouchMove, { passive: false });
```

_Note: Touch event listeners are registered manually with `{ passive: false }` to override default browser mobile scrolling and pull-to-refresh gestures while drawing._

### 4.2 Multi-Touch (Pinch-to-Zoom)

Pinch-to-zoom uses two simultaneous touches. We compute the initial distance and scale user zoom based on finger movements, centering the camera viewport on the pinch midpoint:

$$\text{Midpoint } M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$$

$$\text{New Zoom } Z_{\text{new}} = Z_{\text{initial}} \times \left(\frac{\text{Current Distance}}{\text{Initial Distance}}\right)$$

$$\text{New Pan } P_{\text{new}} = M - W \times Z_{\text{new}}$$
_(where $W$ is the screen midpoint's corresponding world coordinate before scaling)._

### 4.3 High-DPI Resolution Scaling

To prevent blurry shapes on high-density displays (e.g. Apple Retina, iPad Pro, Android AMOLED), we scale the canvas buffer relative to the device pixel ratio, and offset the scale context:

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = displayWidth * dpr;
canvas.height = displayHeight * dpr;
canvas.style.width = `${displayWidth}px`;
canvas.style.height = `${displayHeight}px`;

ctx.scale(dpr, dpr); // Compensates coordinate scale
```

---

## 5. Conflict Resolution & Sync Strategy

### 5.1 Last-Write-Wins (LWW)

Scrawl operates on an optimistic **Last-Write-Wins** strategy on a per-element basis.

- When an element is added, edited (moved/resized), or deleted, it carries a globally unique, client-side generated UUID (`shape-1720684...`).
- Drawing edits arrive as WebSocket updates. The receiving clients replace the locally stored element matching the UUID with the incoming state, ensuring eventual consistency.

### 5.2 Guest Workspace Caching

When operating in Guest Mode:

- Rooms and DB writes are bypassed.
- Drawing actions are written asynchronously to `localStorage` under `guest_canvas_elements`.
- Upon mounting `/canvas/guest`, the canvas reads elements directly from local storage, maintaining single-session workspace persistence without database writes.

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL Database
- `pnpm` package manager (`npm install -g pnpm`)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Create a `.env` file in the root workspace and set your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/scrawl"
   JWT_SECRET="your_jwt_secret"
   ```
3. Push the database schema:
   ```bash
   pnpm db:push
   ```
4. Run the development workspace:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` to view the application.
