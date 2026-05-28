console.log('DEBUG: methodologies/index.js caricato');
const fs = require('fs');
const path = require('path');
const methodologies = {};
const methodsDir = __dirname;
console.log('DEBUG: methodsDir =', methodsDir);
if (fs.existsSync(methodsDir)) {
    fs.readdirSync(methodsDir).forEach(method => {
        const methodPath = path.join(methodsDir, method);
        if (fs.statSync(methodPath).isDirectory() && method !== 'index.js') {
            console.log('DEBUG: trovata cartella', method);
            try {
                const module = require(path.join(methodPath, 'index.js'));
                methodologies[module.METHOD_NAME] = module;
                console.log(`✅ Metodologia caricata: ${module.METHOD_NAME}`);
            } catch (err) {
                console.error(`❌ Errore caricamento metodologia ${method}:`, err.message);
            }
        }
    });
} else {
    console.error('DEBUG: methodsDir non esiste!');
}
module.exports = methodologies;