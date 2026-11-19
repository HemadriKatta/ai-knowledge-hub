import { getEncoding } from "js-tiktoken";

const encoding = getEncoding("cl100k_base");

export interface DocumentChunk {
    chunkIndex: number;
    pageNumber: number;
    content: string;
    tokenCount: number;
}

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

export function createChunks(
    pages: { pageNumber: number; content: string }[]
): DocumentChunk[] {

    const chunks: DocumentChunk[] = [];

    let chunkIndex = 0;

    for (const page of pages) {

        const tokens = encoding.encode(page.content);

        if (tokens.length === 0) continue;

        const step = CHUNK_SIZE - CHUNK_OVERLAP;

        for (
            let start = 0;
            start < tokens.length;
            start += step
        ) {

            const end = Math.min(
                start + CHUNK_SIZE,
                tokens.length
            );

            const chunkTokens = tokens.slice(start, end);

            const content = encoding
                .decode(chunkTokens);

            if (!content.trim()) continue;

            chunks.push({
                chunkIndex: chunkIndex++,
                pageNumber: page.pageNumber,
                content,
                tokenCount: chunkTokens.length
            });

            if (end === tokens.length) break;
        }
    }

    return chunks;
}