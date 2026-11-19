import {
    Request,
    Response,
    NextFunction
} from "express";

import { z } from "zod";

import { pool } from "../../../config/database.js";
import { env } from "../../../config/env.js";

import { ingestDocument } from "../services/document.service.js";
import { embedDocumentChunks } from "../services/embedding.service.js";

import { searchDocuments } from "../services/search.service.js";

const searchSchema = z.object({
    question: z.string().trim().min(3).max(2000),
    topK: z.coerce.number().int().min(1).max(20).default(5)
});

export async function uploadDocument(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "Please upload a PDF file"
            });
            return;
        }

        const result = await ingestDocument(req.file);

        res.status(201).json({
            success: true,
            message: "Document uploaded and processed successfully",
            data: result
        });

    } catch (error) {
        next(error);
    }
}


export async function getDocuments(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        const result = await pool.query(
            `SELECT
                d.id,
                d.title,
                d.original_filename,
                d.status,
                d.file_size,
                d.created_at,
                COUNT(c.id)::INTEGER AS total_chunks
             FROM documents d
             LEFT JOIN document_chunks c
                ON d.id = c.document_id
             WHERE d.user_id = $1
             GROUP BY d.id
             ORDER BY d.created_at DESC`,
            [env.DEV_USER_ID]
        );

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        next(error);
    }
}


export async function getDocumentById(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {

        const validation = z.string().uuid().safeParse(
            req.params.id
        );

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid document ID"
            });
            return;
        }

        const result = await pool.query(
            `SELECT
                d.id,
                d.title,
                d.original_filename,
                d.status,
                d.file_size,
                d.created_at,
                d.error_message,
                COUNT(c.id)::INTEGER AS total_chunks
             FROM documents d
             LEFT JOIN document_chunks c
                ON d.id = c.document_id
             WHERE d.id = $1 AND d.user_id = $2
             GROUP BY d.id`,
            [validation.data, env.DEV_USER_ID]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Document not found"
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
}


export async function generateDocumentEmbeddings(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const documentId = req.params.id;
        if (typeof documentId !== "string" || !documentId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID"
            });
        }

        const result = await embedDocumentChunks(
            documentId,
            env.DEV_USER_ID
        );

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};


export async function searchDocumentChunks(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const input = searchSchema.parse(req.body);

        const result = await searchDocuments(
            input.question,
            env.DEV_USER_ID,
            input.topK
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};