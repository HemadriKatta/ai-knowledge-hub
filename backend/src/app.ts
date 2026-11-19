import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors({
    origin: env.FRONTEND_URL
}));

app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use(errorHandler);

export default app;