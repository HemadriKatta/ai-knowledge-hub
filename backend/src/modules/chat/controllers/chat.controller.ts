
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { env } from "../../../config/env.js";
import { chatWithDocuments } from "../services/chat.service.js";

const chatSchema = z.object({
    question: z.string().trim().min(3).max(2000),
    conversationId: z.string().uuid().optional()
});

export async function chatWithDocumentsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const validation = chatSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid chat request",
                errors: validation.error.flatten()
            });
            return;
        }

        const result = await chatWithDocuments({
            ...validation.data,
            userId: env.DEV_USER_ID
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}
