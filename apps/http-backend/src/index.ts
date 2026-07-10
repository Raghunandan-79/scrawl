import express from "express";
import authRouter from "./routes/auth.js";
import roomRouter from "./routes/room.js";
import chatsRouter from "./routes/chats.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
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

app.listen(3000);