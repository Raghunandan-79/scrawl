import express from "express";
import authRouter from "./routes/auth";
import roomRouter from "./routes/room";
import chatsRouter from "./routes/chats";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "healthy"
    })
})

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/room", roomRouter);
app.use("/api/v1/chats", chatsRouter);

app.listen(3000);