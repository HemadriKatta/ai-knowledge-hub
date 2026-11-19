
// import { pipeline } from "@huggingface/transformers";
// import { pool } from "../../../config/database.js";

// const BATCH_SIZE = 100;
// const EMBEDDING_DIMENSIONS = 384;
// const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

// // Reuse one model instance throughout the application.
// let embeddingPipeline: Promise<any> | null = null;

// async function getEmbeddingModel() {
//     if (!embeddingPipeline) {
//         embeddingPipeline = pipeline(
//             "feature-extraction",
//             MODEL_NAME
//         ).catch((error) => {
//             // Allow a later retry if model initialization fails.
//             embeddingPipeline = null;
//             throw error;
//         });
//     }

//     return embeddingPipeline;
// }

// // Generate a 384-dimensional embedding locally.
// export async function generateEmbedding(
//     text: string
// ): Promise<number[]> {
//     const model = await getEmbeddingModel();

//     const output = await model(text, {
//         pooling: "mean",
//         normalize: true
//     });

//     const embedding = Array.from(output.data) as number[];

//     if (embedding.length !== EMBEDDING_DIMENSIONS) {
//         throw new Error(
//             `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding.length}`
//         );
//     }

//     return embedding;
// }

// // Generate embeddings for all chunks belonging to a document.
// export async function embedDocumentChunks(
//     documentId: string,
//     userId: string
// ) {
//     // Verify that this document belongs to the user.
//     const documentResult = await pool.query(
//         `SELECT id FROM documents
//          WHERE id = $1 AND user_id = $2`,
//         [documentId, userId]
//     );
//     if (documentResult.rowCount === 0) {
//         throw Object.assign(new Error("Document not found"), {
//             statusCode: 404
//         });
//     }

//     // Fetch chunks that do not have embeddings.
//     const chunksResult = await pool.query(
//         `SELECT id, content
//          FROM document_chunks
//          WHERE document_id = $1
//            AND embedding IS NULL
//          ORDER BY chunk_index`,
//         [documentId]
//     );

//     const chunks = chunksResult.rows;

//     if (chunks.length === 0) {
//         return {
//             documentId,
//             processedChunks: 0,
//             message: "All chunks already have embeddings"
//         };
//     }

//     let processedChunks = 0;

//     // Process chunks in batches.
//     for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
//         const batch = chunks.slice(i, i + BATCH_SIZE);

//         // Generate embeddings locally using Hugging Face.
//         const embeddings = await Promise.all(
//             batch.map(async (chunk) => ({
//                 chunkId: chunk.id,
//                 embedding: await generateEmbedding(chunk.content)
//             }))
//         );

//         const client = await pool.connect();

//         try {
//             await client.query("BEGIN");

//             for (const item of embeddings) {
//                 if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
//                     throw new Error("Unexpected embedding dimensions");
//                 }

//                 const vector = `[${item.embedding.join(",")}]`;

//                 await client.query(
//                     `UPDATE document_chunks
//                      SET embedding = $1::vector
//                      WHERE id = $2
//                        AND embedding IS NULL`,
//                     [vector, item.chunkId]
//                 );

//                 processedChunks++;
//             }

//             await client.query("COMMIT");
//         } catch (error) {
//             await client.query("ROLLBACK");
//             throw error;
//         } finally {
//             client.release();
//         }
//     }

//     return {
//         documentId,
//         processedChunks,
//         message: "Document embeddings generated successfully"
//     };
// }



import ollama from "ollama";
import { pool } from "../../../config/database.js";

const BATCH_SIZE = 100;
const EMBEDDING_DIMENSIONS = 768;
const MODEL_NAME = "nomic-embed-text";

// Reuse the Ollama embedding model configuration.
let isModelVerified: Promise<void> | null = null;

async function verifyEmbeddingModel() {
    if (!isModelVerified) {
        isModelVerified = ollama.list()
            .then((response) => {
                const modelExists = response.models.some(
                    (model) =>
                        model.name === MODEL_NAME ||
                        model.name.startsWith(`${MODEL_NAME}:`)
                );

                if (!modelExists) {
                    throw new Error(
                        `Ollama model '${MODEL_NAME}' not found. Run: ollama pull ${MODEL_NAME}`
                    );
                }
            })
            .catch((error) => {
                isModelVerified = null;
                throw error;
            });
    }

    return isModelVerified;
}

// Generate a 768-dimensional embedding locally using Ollama.
export async function generateEmbedding(
    text: string
): Promise<number[]> {

    await verifyEmbeddingModel();

    const response = await ollama.embed({
        model: MODEL_NAME,
        input: text
    });

    const embedding = response.embeddings[0];

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
            `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding?.length ?? 0}`
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

    await verifyEmbeddingModel();

    let processedChunks = 0;

    // Process chunks in batches.
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        // Generate embeddings using Ollama.
        const response = await ollama.embed({
            model: MODEL_NAME,
            input: batch.map((chunk) => chunk.content)
        });

        const embeddings = response.embeddings;

        if (embeddings.length !== batch.length) {
            throw new Error("Embedding count does not match chunk count");
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            for (let j = 0; j < batch.length; j++) {
                const embedding = embeddings[j];

                if (embedding.length !== EMBEDDING_DIMENSIONS) {
                    throw new Error(
                        `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding.length}`
                    );
                }

                const vector = `[${embedding.join(",")}]`;

                await client.query(
                    `UPDATE document_chunks
                     SET embedding = $1::vector
                     WHERE id = $2
                       AND embedding IS NULL`,
                    [vector, batch[j].id]
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
