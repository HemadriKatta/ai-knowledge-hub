import { generateEmbedding } from "../modules/documents/services/embedding.service.js"

async function testEmbedding() {
    const text =
        "Knowledge Hub stores and retrieves documents.";

    console.log("Generating embedding...");

    const embedding = await generateEmbedding(text);

    console.log("Embedding dimensions:", embedding.length);
    console.log("First five values:", embedding.slice(0, 5));
}

testEmbedding().catch(console.error);