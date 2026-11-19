
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.string().default("development"),
    DATABASE_URL: z.string().min(1),

    GEMINI_API_KEY: z.string().min(1),
    GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
    GEMINI_EMBEDDING_MODEL: z.string().default(
        "gemini-embedding-001"
    ),

    FRONTEND_URL: z.string().default(
        "http://localhost:5173"
    )
});

export const env = envSchema.parse(process.env);
