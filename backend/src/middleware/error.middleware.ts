import {
    Request,
    Response,
    NextFunction
} from "express";

export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("API Error:", error);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
}