import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, pool } from "./config/database.js";

async function startServer() {
    try {
        await connectDatabase();

        const server = app.listen(env.PORT, () => {
            console.log(
                `Server running at http://localhost:${env.PORT}`
            );
        });

        const shutdown = async () => {
            console.log("Shutting down server...");

            server.close(async () => {
                await pool.end();
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();