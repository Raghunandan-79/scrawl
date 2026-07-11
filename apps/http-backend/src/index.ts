import express from "express";
import authRouter from "./routes/auth.js";
import roomRouter from "./routes/room.js";
import chatsRouter from "./routes/chats.js";

const app = express();
app.use(express.json());

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
];

app.use((req, res, next) => {
    const origin = req.headers.origin as string;
    const isAllowed =
        origin && (
            origin === "http://localhost:3000" ||
            origin.endsWith(".raghunandan.dev") ||
            ALLOWED_ORIGINS.includes(origin)
        );
    if (isAllowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});

app.get("/", (req, res) => {
    res.json({
        message: "healthy"
    })
})

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/room", roomRouter);
app.use("/api/v1/chats", chatsRouter);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`http-backend listening on ${PORT}`));