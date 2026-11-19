
import { pool } from "../../../config/database.js";
import { generateRAGAnswer } from "./rag.service.js";

interface ChatInput {
    question: string;
    userId: string;
    conversationId?: string;
}

export async function chatWithDocuments(input: ChatInput) {
    const { question, userId, conversationId } = input;

    let activeConversationId = conversationId;

    // Step 1: Create a conversation if one wasn't supplied.
    if (!activeConversationId) {
        const conversation = await pool.query(
            `INSERT INTO conversations (user_id, title)
             VALUES ($1, $2)
             RETURNING id`,
            [userId, question.slice(0, 100)]
        );

        activeConversationId = conversation.rows[0].id;
    } else {
        // Verify conversation ownership.
        const conversation = await pool.query(
            `SELECT id FROM conversations
             WHERE id = $1 AND user_id = $2`,
            [activeConversationId, userId]
        );

        if (conversation.rowCount === 0) {
            throw Object.assign(
                new Error("Conversation not found"),
                { statusCode: 404 }
            );
        }
    }

    // Step 2: Save the user's question.
    await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [activeConversationId, question]
    );

    // Step 3: Execute the RAG pipeline.
    const ragResult = await generateRAGAnswer(question, userId);

    // Step 4: Save the assistant's answer.
    const assistantMessage = await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'assistant', $2)
         RETURNING id, created_at`,
        [activeConversationId, ragResult.answer]
    );

    return {
        conversationId: activeConversationId,
        messageId: assistantMessage.rows[0].id,
        question,
        answer: ragResult.answer,
        sources: ragResult.sources.map((source, index) => ({
            reference: `SOURCE ${index + 1}`,
            documentId: source.documentId,
            documentTitle: source.documentTitle,
            pageNumber: source.pageNumber,
            similarity: source.similarity
        })),
        model: ragResult.model,
        createdAt: assistantMessage.rows[0].created_at
    };
}
