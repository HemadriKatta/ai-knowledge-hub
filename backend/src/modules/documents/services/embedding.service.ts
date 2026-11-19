
import { pipeline } from "@huggingface/transformers";
import { pool } from "../../../config/database.js";

const BATCH_SIZE = 100;
const EMBEDDING_DIMENSIONS = 384;
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

// Reuse one model instance throughout the application.
let embeddingPipeline: Promise<any> | null = null;

async function getEmbeddingModel() {
    if (!embeddingPipeline) {
        embeddingPipeline = pipeline(
            "feature-extraction",
            MODEL_NAME
        ).catch((error) => {
            // Allow a later retry if model initialization fails.
            embeddingPipeline = null;
            throw error;
        });
    }

    return embeddingPipeline;
}

// Generate a 384-dimensional embedding locally.
export async function generateEmbedding(
    text: string
): Promise<number[]> {
    const model = await getEmbeddingModel();

    const output = await model(text, {
        pooling: "mean",
        normalize: true
    });

    const embedding = Array.from(output.data) as number[];

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
            `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding.length}`
        );
    }

    return embedding;
}

// Generate embeddings for all chunks belonging to a document.
export async function embedDocumentChunks(
    documentId: string,
    userId: string
) {
    // Verify that this document belongs to the user.
    const documentResult = await pool.query(
        `SELECT id FROM documents
         WHERE id = $1 AND user_id = $2`,
        [documentId, userId]
    );
    if (documentResult.rowCount === 0) {
        throw Object.assign(new Error("Document not found"), {
            statusCode: 404
        });
    }

    // Fetch chunks that do not have embeddings.
    const chunksResult = await pool.query(
        `SELECT id, content
         FROM document_chunks
         WHERE document_id = $1
           AND embedding IS NULL
         ORDER BY chunk_index`,
        [documentId]
    );

    const chunks = chunksResult.rows;

    if (chunks.length === 0) {
        return {
            documentId,
            processedChunks: 0,
            message: "All chunks already have embeddings"
        };
    }

    let processedChunks = 0;

    // Process chunks in batches.
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        // Generate embeddings locally using Hugging Face.
        const embeddings = await Promise.all(
            batch.map(async (chunk) => ({
                chunkId: chunk.id,
                embedding: await generateEmbedding(chunk.content)
            }))
        );

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            for (const item of embeddings) {
                if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
                    throw new Error("Unexpected embedding dimensions");
                }

                const vector = `[${item.embedding.join(",")}]`;

                await client.query(
                    `UPDATE document_chunks
                     SET embedding = $1::vector
                     WHERE id = $2
                       AND embedding IS NULL`,
                    [vector, item.chunkId]
                );

                processedChunks++;
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    return {
        documentId,
        processedChunks,
        message: "Document embeddings generated successfully"
    };
}
