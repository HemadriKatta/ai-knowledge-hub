
import { pool } from "../../../config/database.js";
import { generateRAGAnswer } from "./rag.service.js";
import {
    ChatInput,
    ChatHistoryMessage
} from "../types/chat.types.js";

export async function chatWithDocuments(input: ChatInput) {
    const { question, userId } = input;

    let activeConversationId = input.conversationId;

    // Step 1: Create or validate conversation.
    if (!activeConversationId) {
        const conversation = await pool.query(
            `INSERT INTO conversations (user_id, title)
             VALUES ($1, $2)
             RETURNING id`,
            [userId, question.slice(0, 100)]
        );

        activeConversationId = conversation.rows[0].id;
    } else {
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

    // Step 2: Fetch the last 10 messages BEFORE saving
    // the current question.
    const historyResult = await pool.query(
        `SELECT role, content
         FROM (
             SELECT role, content, created_at
             FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT 10
         ) recent_messages
         ORDER BY created_at ASC`,
        [activeConversationId]
    );

    const history: ChatHistoryMessage[] =
        historyResult.rows.map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content
        }));

    // Step 3: Save current user message.
    await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [activeConversationId, question]
    );

    // Step 4: Execute context-aware RAG.
    const ragResult = await generateRAGAnswer(
        question,
        userId,
        history
    );

    // Step 5: Save assistant response.
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
        searchQuery: ragResult.searchQuery,
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
