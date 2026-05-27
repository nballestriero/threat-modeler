const axios = require('axios');
(async () => {
    try {
        const res = await axios.get('http://localhost:8000/api/v2/heartbeat', { timeout: 5000 });
        console.log('Risposta:', res.status, res.data);
    } catch (err) {
        console.error('Errore:', err.message);
    }
})();