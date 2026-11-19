import pdfParse from "pdf-parse";

export interface ExtractedPage {
    pageNumber: number;
    content: string;
}

export async function extractPdfText(
    buffer: Buffer
): Promise<ExtractedPage[]> {

    const signature = buffer
        .subarray(0, 5)
        .toString("ascii");

    if (signature !== "%PDF-") {
        throw new Error("Invalid PDF file");
    }

    const pages: ExtractedPage[] = [];

    await pdfParse(buffer, {
        pagerender: async (pageData: any) => {

            const textContent =
                await pageData.getTextContent();

            const pageText = textContent.items
                .map((item: any) => item.str ?? "")
                .join(" ")
                .trim();

            pages.push({
                pageNumber: pages.length + 1,
                content: pageText
            });

            return pageText;
        }
    });

    return pages.filter(
        page => page.content.length > 0
    );
}