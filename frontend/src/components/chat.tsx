
import { useState } from "react";
import { sendChatMessage } from "../services/api";

interface Source {
    reference: string;
    documentTitle: string;
    pageNumber: number | null;
    similarity: number;
}

interface ChatResponse {
    conversationId: string;
    answer: string;
    sources: Source[];
}

export default function Chat() {
    const [question, setQuestion] = useState("");
    const [conversationId, setConversationId] = useState<string>();
    const [messages, setMessages] = useState<
        { role: "user" | "assistant"; content: string; sources?: Source[] }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSend() {
        const value = question.trim();

        if (!value || loading) return;

        setMessages((previous) => [
            ...previous,
            { role: "user", content: value }
        ]);

        setQuestion("");
        setLoading(true);
        setError("");

        try {
            const response = await sendChatMessage({
                question: value,
                conversationId
            });

            const data: ChatResponse = response.data;

            setConversationId(data.conversationId);

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content: data.answer,
                    sources: data.sources
                }
            ]);
        } catch {
            setError("Unable to generate an answer. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 800, margin: "30px auto", padding: 20 }}>
            <h2>AI Knowledge Hub</h2>
            <p>Ask questions about your uploaded documents.</p>

            <div style={{ minHeight: 300 }}>
                {messages.map((message, index) => (
                    <div key={index} style={{ marginBottom: 20 }}>
                        <strong>
                            {message.role === "user" ? "You" : "AI"}
                        </strong>

                        <p style={{ whiteSpace: "pre-wrap" }}>
                            {message.content}
                        </p>

                        {message.sources?.map((source) => (
                            <div key={source.reference}>
                                <small>
                                    [{source.reference}] {source.documentTitle}
                                    {source.pageNumber != null
                                        ? ` — Page ${source.pageNumber}`
                                        : ""}
                                </small>
                            </div>
                        ))}
                    </div>
                ))}

                {loading && <p>AI is thinking...</p>}
                {error && <p role="alert">{error}</p>}
            </div>

            <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about your documents..."
                rows={3}
                style={{ width: "100%", padding: 10 }}
            />

            <button
                onClick={handleSend}
                disabled={loading || !question.trim()}
                style={{ marginTop: 10, padding: "10px 20px" }}
            >
                Send
            </button>
        </div>
    );
}
