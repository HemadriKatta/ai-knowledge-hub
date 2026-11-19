import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 30000
});

export async function checkBackend() {
    const response = await api.get("/health");
    return response.data;
}

export async function askAI(question: string) {
    const response = await api.post("/ai/test", {
        question
    });

    return response.data;
}