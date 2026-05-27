// services/ragIndexer.js
const axios = require('axios');
const { getEmbedding } = require('../utils/embeddingUtils');
const { createCollection, addEmbeddings, queryCollection } = require('../utils/chromaV2Utils');


async function createCollection(baseUrl, collectionName) {
    try {
        await axios.post(`${baseUrl}/api/v2/collections`, { name: collectionName });
    } catch (err) {
        if (err.response?.status !== 409) throw err; // 409 = già esistente
    }
}

async function indexChunks(chunks, metadata, ragConfig, ollamaBaseUrl) {
    const { baseUrl, embeddingModel } = ragConfig;
    const collectionName = `${ragConfig.collectionPrefix}${metadata.docId}_${Date.now()}`;
    await createCollection(baseUrl, collectionName);
    const ids = chunks.map((_, idx) => `${metadata.docId}_chunk_${idx}`);
    const embeddings = await Promise.all(chunks.map(chunk => getEmbedding(chunk, ollamaBaseUrl, embeddingModel)));
    await addEmbeddings(baseUrl, collectionName, ids, embeddings, chunks.map(() => metadata), chunks);
    return collectionName;
}

async function querySimilarChunks(collectionName, queryText, ragConfig, ollamaBaseUrl, topK = 3) {
    const { baseUrl, embeddingModel } = ragConfig;
    const queryEmbedding = await getEmbedding(queryText, ollamaBaseUrl, embeddingModel);
    const results = await queryCollection(baseUrl, collectionName, [queryEmbedding], topK);
    return results.documents[0] || [];
}

module.exports = { indexChunks, querySimilarChunks };