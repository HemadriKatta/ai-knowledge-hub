import { Router } from "express";
import {
    chatWithDocumentsController
} from "../controllers/chat.controller.js";

const router = Router();

router.post("/", chatWithDocumentsController);

export default router;