// backend/run-tests.js
const { execSync } = require('child_process');

console.log('\n🧪 AVVIO TEST BACKEND\n');

try {
    const output = execSync('npm test -- --json --outputFile=test-results.json', { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
    // Il comando npm test potrebbe uscire con codice 1 se ci sono fallimenti, ma noi vogliamo comunque processare il JSON
}

const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log('\n📊 REPORT TEST BACKEND\n');
console.log(`Totale suite: ${results.numTotalTestSuites}`);
console.log(`Suite passate: ${results.numPassedTestSuites}`);
console.log(`Suite fallite: ${results.numFailedTestSuites}`);
console.log(`Totale test: ${results.numTotalTests}`);
console.log(`Test passati: ${results.numPassedTests}`);
console.log(`Test falliti: ${results.numFailedTests}`);
console.log(`Durata: ${(results.endTime - results.startTime) / 1000} secondi\n`);

if (results.numFailedTests > 0) {
    console.log('❌ TEST FALLITI:\n');
    for (const suite of results.testResults) {
        if (suite.status === 'failed') {
            console.log(`📁 ${suite.name}`);
            for (const test of suite.assertionResults) {
                if (test.status === 'failed') {
                    console.log(`   - ${test.title}`);
                    console.log(`     → ${test.failureMessages[0].split('\n')[0]}`);
                }
            }
            console.log('');
        }
    }
} else {
    console.log('✅ TUTTI I TEST SUPERATI!\n');
}

// Pulisci il file temporaneo
fs.unlinkSync('test-results.json');