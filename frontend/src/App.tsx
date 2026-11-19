import { useState } from "react";
import {
  askAI,
  checkBackend
} from "./services/api";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Not checked");

  const handleHealthCheck = async () => {
    try {
      const result = await checkBackend();
      setStatus(result.message);
    } catch {
      setStatus("Backend connection failed");
    }
  };

  const handleAskAI = async () => {
    if (!question.trim()) return;

    try {
      setLoading(true);
      setAnswer("");

      const result = await askAI(question);

      setAnswer(result.data.answer);
    } catch (error) {
      setAnswer("Unable to generate response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      maxWidth: "800px",
      margin: "60px auto",
      padding: "20px",
      fontFamily: "Arial"
    }}>
      <h1>AI Knowledge Hub</h1>

      <p>
        Your personal AI-powered knowledge assistant.
      </p>

      <section>
        <h3>Backend Status</h3>

        <button onClick={handleHealthCheck}>
          Check Backend
        </button>

        <p>{status}</p>
      </section>

      <hr />

      <section>
        <h3>Ask AI</h3>

        <textarea
          value={question}
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          placeholder="Ask something about technology..."
          rows={4}
          style={{ width: "100%", padding: "10px" }}
        />

        <button
          onClick={handleAskAI}
          disabled={loading || !question.trim()}
        >
          {loading ? "Generating..." : "Ask AI"}
        </button>

        {answer && (
          <div>
            <h3>AI Response</h3>
            <p>{answer}</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;