const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Forza l'esecuzione dei test con output JSON
try {
    execSync('npm test -- --json --outputFile=test-results.json', { stdio: 'inherit' });
} catch (err) {
    // Non fare nulla, il file JSON sarà comunque generato
}

const resultsPath = path.join(__dirname, '../test-results.json');
if (!fs.existsSync(resultsPath)) {
    console.error('Nessun risultato trovato. Assicurati che Jest abbia generato test-results.json');
    process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
const numTotalTests = results.numTotalTests;
const numPassedTests = results.numPassedTests;
const numFailedTests = results.numFailedTests;
const numTotalTestSuites = results.numTotalTestSuites;
const numPassedTestSuites = results.numPassedTestSuites;
const numFailedTestSuites = results.numFailedTestSuites;

console.log(`\n📊 REPORT TEST`);
console.log(`================`);
console.log(`Totale suite: ${numTotalTestSuites}`);
console.log(`Suite passate: ${numPassedTestSuites}`);
console.log(`Suite fallite: ${numFailedTestSuites}`);
console.log(`Totale test: ${numTotalTests}`);
console.log(`Test passati: ${numPassedTests}`);
console.log(`Test falliti: ${numFailedTests}`);
console.log(`Durata: ${(results.startTime ? (Date.now() - results.startTime) / 1000 : '?')} secondi\n`);

if (numFailedTests > 0) {
    console.log(`❌ TEST FALLITI:\n`);
    for (const suite of results.testResults) {
        if (suite.numFailingTests > 0) {
            console.log(`📁 ${suite.name}`);
            for (const test of suite.assertionResults) {
                if (test.status === 'failed') {
                    console.log(`   - ${test.title}`);
                    console.log(`     → ${test.failureMessages[0]?.split('\n')[0] || 'nessun dettaglio'}`);
                }
            }
            console.log('');
        }
    }
} else {
    console.log('✅ Tutti i test sono passati!');
}