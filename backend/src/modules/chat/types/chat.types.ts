
export interface ChatHistoryMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatInput {
    question: string;
    userId: string;
    conversationId?: string;
}
