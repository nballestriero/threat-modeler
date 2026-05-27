const phase1Extract = require('./phase1_extract');
const phase2Dedup = require('./phase2_dedup');
const phase3Enrich = require('./phase3_enrich');
const phase4Consolidate = require('./phase4_consolidate');

async function runAnalysisPipeline(ctx) {
    console.log("\n🔍 AVVIO ANALISI IN 4 FASI");
    console.log(`   📂 Documenti da analizzare: ${ctx.docFiles?.length || 0}`);
    console.log(`   📚 File di contesto (fissi): ${ctx.contextFiles?.length || 0}`);
    if (ctx.fixedContextRich) {
        console.log(`   📄 Contesto aggiuntivo: ${ctx.fixedContextRich.length} caratteri (usato in fase 3)`);
    }
    const totalChars = ctx.chunks.reduce((acc, ch) => acc + ch.length, 0);
    console.log(`   📄 Testo totale documenti: ${totalChars} caratteri suddivisi in ${ctx.chunks.length} chunk.`);

    ctx = await phase1Extract(ctx);
    ctx = phase2Dedup(ctx);
    ctx = await phase3Enrich(ctx);
    ctx = phase4Consolidate(ctx);

    console.log("🏁 ANALISI TERMINATA.\n");
    return ctx;
}

module.exports = { runAnalysisPipeline };