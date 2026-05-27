const axios = require('axios');

const DEFAULT_TENANT = 'default_tenant';
const DEFAULT_DATABASE = 'default_database';

async function chromaRequest(baseUrl, method, path, data = null) {
    const url = `${baseUrl}/api/v2/tenants/${DEFAULT_TENANT}/databases/${DEFAULT_DATABASE}/${path}`;
    const response = await axios({ method, url, data, headers: { 'Content-Type': 'application/json' } });
    return response.data;
}

async function createCollection(baseUrl, name) {
    const result = await chromaRequest(baseUrl, 'post', 'collections', { name });
    return { name: result.name, id: result.id };
}

async function addEmbeddings(baseUrl, collectionId, ids, embeddings, metadatas, documents) {
    return chromaRequest(baseUrl, 'post', `collections/${collectionId}/add`, {
        ids,
        embeddings,
        metadatas,
        documents
    });
}

async function queryCollection(baseUrl, collectionId, queryEmbeddings, nResults = 3) {
    return chromaRequest(baseUrl, 'post', `collections/${collectionId}/query`, {
        query_embeddings: queryEmbeddings,
        n_results: nResults
    });
}

module.exports = { createCollection, addEmbeddings, queryCollection };