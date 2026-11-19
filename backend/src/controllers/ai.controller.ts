
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { testGemini } from "../services/ai.services.js";

const testSchema = z.object({
    question: z.string().trim().min(1).max(2000)
});

export async function testAI(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const validation = testSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Invalid request",
                errors: validation.error.flatten()
            });
            return;
        }

        const result = await testGemini(
            validation.data.question
        );

        res.status(200).json({
            success: true,
            message: "Gemini integration successful",
            data: result
        });

    } catch (error) {
        next(error);
    }
}
