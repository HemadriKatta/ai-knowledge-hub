
import { pool } from "../../../config/database.js";
import { generateEmbedding } from "./embedding.service.js";

export async function searchDocuments(
    question: string,
    userId: string,
    topK = 5
) {
    // 1. Convert the question into a Hugging Face embedding.
    const queryEmbedding = await generateEmbedding(question);

    // 2. Convert the embedding into PostgreSQL vector format.
    const vector = `[${queryEmbedding.join(",")}]`;

    // 3. Find the most similar chunks belonging to this user.
    const result = await pool.query(
        `SELECT
            c.id AS chunk_id,
            c.content,
            c.chunk_index,
            c.page_number,
            d.id AS document_id,
            d.title AS document_title,
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

    return {
        question,
        results: result.rows
    };
}
