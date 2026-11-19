import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database.js";

export async function healthCheck(
    req: Request,
    res: Response
) {
    res.status(200).json({
        success: true,
        message: "AI Knowledge Hub backend is running",
        timestamp: new Date().toISOString()
    });
}

export async function databaseHealthCheck(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database,
                version() AS version,
                EXISTS (
                    SELECT 1
                    FROM pg_extension
                    WHERE extname = 'vector'
                ) AS pgvector_enabled
        `);

        res.status(200).json({
            success: true,
            message: "Database connected successfully",
            data: {
                database: result.rows[0].database,
                pgvectorEnabled: result.rows[0].pgvector_enabled
            }
        });
    } catch (error) {
        next(error);
    }
}