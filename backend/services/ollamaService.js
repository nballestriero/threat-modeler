// backend/services/ollamaService.js
/**
 * @file Servizio per la comunicazione con Ollama (LLM locale)
 * @module services/ollamaService
 */

const axios = require('axios');

/**
 * Chiamata a Ollama per completare un prompt.
 * @async
 * @param {string} prompt - Prompt da inviare
 * @param {Object} config - Configurazione dell'applicazione (contiene ollama.baseUrl, model, timeout)
 * @param {Object} [options] - Opzioni aggiuntive
 * @param {number} [options.timeout=300000] - Timeout in ms (default 5 minuti)
 * @param {number} [options.temperature=0.1] - Temperatura
 * @param {number} [options.numPredict=256] - Token massimi da generare
 * @param {string} [options.systemPrompt] - System prompt
 * @returns {Promise<string>} Risposta testuale
 * @throws {Error} Se Ollama non risponde o restituisce errore
 */
async function callOllama(prompt, config, options = {}) {
    const { baseUrl, model, timeout = 300000 } = config.ollama || {};
    const payload = {
        model: model || 'llama3.1:8b',
        messages: [
            { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
            temperature: options.temperature ?? 0.1,
            num_predict: options.numPredict ?? 512,  
            stop: ['\n```', '```']
        }
    };

    console.log(`📡 [OLLAMA] Invio richiesta a ${baseUrl}/api/chat, modello ${payload.model}, timeout=${timeout}ms`);

    try {
        const response = await axios.post(`${baseUrl}/api/chat`, payload, {
            timeout,
            headers: { 'Content-Type': 'application/json' }
        });
        let content = response.data.message?.content || '';
        if (content.length > 10000) {
            console.warn(`⚠️ Risposta Ollama troncata da ${content.length} a 10000 caratteri`);
            content = content.substring(0, 10000);
        }
        console.log(`✅ [OLLAMA] Risposta ricevuta (${content.length} caratteri)`);
        return content;
    } catch (err) {
        console.error(`❌ Errore chiamata Ollama: ${err.message}`);
        throw new Error(`LLM non disponibile: ${err.message}`);
    }
}

module.exports = { callOllama };