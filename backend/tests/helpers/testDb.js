const path = require('path');
const fs = require('fs').promises;

const TEST_JSON_FILE = path.join(__dirname, '../../threat-model.test.json');

// Sovrascrivi il percorso del file nei model (dobbiamo fare mocking)
// Oppure modifichiamo assetModel.js per accettare un percorso opzionale (meglio).

// Per semplicità iniziale: creiamo una funzione che copia il file originale in uno di test
// e lo ripristina dopo ogni test. Ma la soluzione più pulita è iniettare la dipendenza.

// Proposta: modifichiamo assetModel.js per permettere un percorso personalizzato tramite variabile d'ambiente.