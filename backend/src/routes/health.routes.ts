import { Router } from "express";
import {
    healthCheck,
    databaseHealthCheck
} from "../controllers/health.controller.js";

const router = Router();

router.get("/", healthCheck);
router.get("/db", databaseHealthCheck);

export default router;