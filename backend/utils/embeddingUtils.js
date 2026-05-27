const axios = require('axios');

async function getEmbedding(text, ollamaBaseUrl, model = 'nomic-embed-text') {
    try {
        const response = await axios.post(`${ollamaBaseUrl}/api/embeddings`, {
            model,
            prompt: text
        });
        return response.data.embedding;
    } catch (err) {
        console.error('Errore embedding Ollama:', err.message);
        throw new Error(`Embedding failed: ${err.message}`);
    }
}

module.exports = { getEmbedding };