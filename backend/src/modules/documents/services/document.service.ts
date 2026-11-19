import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { pool } from "../../../config/database.js";
import { env } from "../../../config/env.js";

import { extractPdfText } from "./pdf.service.js";
import { createChunks } from "./chunking.service.js";

interface UploadedFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export async function ingestDocument(file: UploadedFile) {

    // 1. Calculate SHA-256 checksum
    const checksum = createHash("sha256")
        .update(file.buffer)
        .digest("hex");

    // 2. Check duplicate document
    const existing = await pool.query(
        `SELECT id, title
         FROM documents
         WHERE user_id = $1 AND checksum = $2`,
        [env.DEV_USER_ID, checksum]
    );

    if (existing.rowCount) {
        throw Object.assign(
            new Error("This document has already been uploaded"),
            { statusCode: 409 }
        );
    }

    // 3. Generate unique filename
    const fileName = `${randomUUID()}.pdf`;

    const uploadDirectory = path.resolve(
        process.cwd(),
        "uploads"
    );

    const filePath = path.join(
        uploadDirectory,
        fileName
    );

    await mkdir(uploadDirectory, { recursive: true });

    // 4. Save original PDF
    await writeFile(filePath, file.buffer);

    let documentId: string | undefined;

    try {

        // 5. Create document record
        const documentResult = await pool.query(
            `INSERT INTO documents (
                user_id,
                title,
                original_filename,
                file_path,
                mime_type,
                file_size,
                checksum,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSING')
            RETURNING id, title, status, created_at`,
            [
                env.DEV_USER_ID,
                file.originalname,
                file.originalname,
                `uploads/${fileName}`,
                file.mimetype,
                file.size,
                checksum
            ]
        );

        const document = documentResult.rows[0];

        documentId = document.id;

        // 6. Extract PDF text page by page
        const pages = await extractPdfText(file.buffer);

        if (pages.length === 0) {
            throw new Error(
                "No readable text found in the PDF. OCR may be required."
            );
        }

        // 7. Generate document chunks
        const chunks = createChunks(pages);

        if (chunks.length === 0) {
            throw new Error("No document chunks generated");
        }

        // 8. Save all chunks in a transaction
        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            for (const chunk of chunks) {

                await client.query(
                    `INSERT INTO document_chunks (
                        document_id,
                        content,
                        chunk_index,
                        page_number
                    )
                    VALUES ($1, $2, $3, $4)`,
                    [
                        documentId,
                        chunk.content,
                        chunk.chunkIndex,
                        chunk.pageNumber
                    ]
                );
            }

            // 9. Mark document completed
            await client.query(
                `UPDATE documents
                 SET status = 'COMPLETED',
                     error_message = NULL
                 WHERE id = $1`,
                [documentId]
            );

            await client.query("COMMIT");

        } catch (error) {

            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

        // 10. Return ingestion result
        return {
            documentId,
            title: document.title,
            status: "COMPLETED",
            totalPages: pages.length,
            totalChunks: chunks.length,
            totalTokens: chunks.reduce(
                (sum, chunk) => sum + chunk.tokenCount,
                0
            )
        };

    } catch (error) {

        // Mark failed documents for debugging
        if (documentId) {
            await pool.query(
                `UPDATE documents
                 SET status = 'FAILED',
                     error_message = $2
                 WHERE id = $1`,
                [
                    documentId,
                    error instanceof Error
                        ? error.message
                        : "Unknown processing error"
                ]
            );
        }

        throw error;
    }
}