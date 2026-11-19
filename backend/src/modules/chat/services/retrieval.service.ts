
import { pool } from "../../../config/database.js";
import { generateEmbedding } from "../../documents/services/embedding.service.js";

export interface RetrievedChunk {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    pageNumber: number | null;
    content: string;
    similarity: number;
}

export async function retrieveRelevantChunks(
    question: string,
    userId: string,
    topK = 5
): Promise<RetrievedChunk[]> {

    // Step 1: Convert question into a vector using Transformers.js.
    const embedding = await generateEmbedding(question);

    const vector = `[${embedding.join(",")}]`;

    // Step 2: Retrieve semantically similar document chunks.
    const result = await pool.query(
        `SELECT
            c.id AS chunk_id,
            c.document_id,
            d.title AS document_title,
            c.page_number,
            c.content,
            1 - (c.embedding <=> $1::vector) AS similarity
         FROM document_chunks c
         INNER JOIN documents d
            ON d.id = c.document_id
         WHERE d.user_id = $2
           AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> $1::vector
         LIMIT $3`,
        [vector, userId, topK]
    );

    return result.rows.map((row) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        pageNumber: row.page_number,
        content: row.content,
        similarity: Number(row.similarity)
    }));
}
