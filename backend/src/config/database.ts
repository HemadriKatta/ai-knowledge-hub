import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

export async function connectDatabase() {
    const client = await pool.connect();

    try {
        await client.query("SELECT 1");
        console.log("PostgreSQL connected successfully");
    } finally {
        client.release();
    }
}