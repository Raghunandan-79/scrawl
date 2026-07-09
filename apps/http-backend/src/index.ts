import express from "express";
import authRouter from "./routes/auth";
import roomRouter from "./routes/room";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "healthy"
    })
})

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/room", roomRouter);

app.listen(3000);