const axios = require('axios');

async function callOllama(config, systemPrompt, userPrompt, options = {}) {
    const { baseUrl, model } = config.ollama;
    const temperature = options.temperature || 0.1;
    const numPredict = options.num_predict || 256;
    const response = await axios.post(`${baseUrl}/api/chat`, {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: { temperature, num_predict: numPredict }
    });
    return response.data.message?.content || response.data.response || '';
}

function extractFirstJSON(text) {
    let match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (match) return match[0];
    match = text.match(/\{[\s\S]*?\}/);
    if (match) return match[0];
    return null;
}

module.exports = { callOllama, extractFirstJSON };