import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.json({
        message: "healthy"
    })
})

app.listen(3000);