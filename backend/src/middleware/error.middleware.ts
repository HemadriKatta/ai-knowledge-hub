
import {
    Request,
    Response,
    NextFunction
} from "express";

import multer from "multer";

export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void {

    console.error("API Error:", error);

    // Handle Multer upload errors
    if (error instanceof multer.MulterError) {

        const statusCode =
            error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });

        return;
    }

    // Handle custom application errors
    const statusCode =
        error instanceof Error &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
            ? error.statusCode
            : 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 400 && statusCode < 500 &&
                error instanceof Error
                ? error.message
                : "Internal server error"
    });
}
