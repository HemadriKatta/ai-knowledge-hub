import { Router } from "express";

import {
    uploadDocument,
    getDocuments,
    getDocumentById,
    generateDocumentEmbeddings,
    searchDocumentChunks
} from "../controllers/document.controller.js";

import { upload } from "../utils/upload.js";

const router = Router();

router.post("/search", searchDocumentChunks);

router.post(
    "/upload",
    upload.single("file"),
    uploadDocument
);

router.get("/", getDocuments);

router.get("/:id", getDocumentById);

router.post("/:id/embed", generateDocumentEmbeddings);

export default router;