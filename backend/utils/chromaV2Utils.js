const axios = require('axios');

async function chromaHeartbeat(baseUrl) {
    const response = await axios.get(`${baseUrl}/api/v2/heartbeat`, { timeout: 5000 });
    return response.data;
}

async function createCollection(baseUrl, name) {
    const response = await axios.post(`${baseUrl}/api/v2/collections`, { name }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
}

async function addEmbeddings(baseUrl, collectionName, ids, embeddings, metadatas, documents) {
    const response = await axios.post(`${baseUrl}/api/v2/collections/${collectionName}/add`, {
        ids, embeddings, metadatas, documents
    });
    return response.data;
}

async function queryCollection(baseUrl, collectionName, queryEmbeddings, nResults = 3) {
    const response = await axios.post(`${baseUrl}/api/v2/collections/${collectionName}/query`, {
        query_embeddings: queryEmbeddings,
        n_results: nResults
    });
    return response.data;
}

module.exports = { chromaHeartbeat, createCollection, addEmbeddings, queryCollection };