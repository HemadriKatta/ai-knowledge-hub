
import { gemini } from "../config/gemini.js";
import { env } from "../config/env.js";

export async function testGemini(question: string) {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await gemini.models.generateContent({
                model: env.GEMINI_MODEL,
                contents: question,
                config: {
                    systemInstruction: `
                        You are an AI assistant for AI Knowledge Hub.
                        Give clear, technically accurate answers.
                        Keep your answer concise.
                    `
                }
            });

            return {
                answer: response.text ?? "",
                model: env.GEMINI_MODEL
            };

        } catch (error: any) {
            const status = error?.status;

            if (
                status !== 503 &&
                status !== 429 &&
                status !== 500
            ) {
                throw error;
            }

            if (attempt === maxRetries) {
                throw error;
            }

            const delay = 1000 * Math.pow(2, attempt);

            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );
        }
    }

    throw new Error("Gemini request failed after retries");
}
