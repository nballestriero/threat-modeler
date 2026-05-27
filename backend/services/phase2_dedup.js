function phase2Dedup(ctx) {
    const { rawOccurrences } = ctx;
    console.log("\n📍 FASE 2: Cross-check e deduplica asset");
    const assetGroups = new Map();
    for (const occ of rawOccurrences) {
        const key = occ.name.toLowerCase();
        if (!assetGroups.has(key)) {
            assetGroups.set(key, { name: occ.name, chunkIndices: new Set() });
        }
        assetGroups.get(key).chunkIndices.add(occ.chunkIndex);
    }
    const uniqueAssets = Array.from(assetGroups.values()).map(group => ({
        name: group.name,
        chunkIndices: Array.from(group.chunkIndices).sort((a, b) => a - b),
        primaryChunkIndex: group.chunkIndices.values().next().value
    }));
    console.log(`   ✅ Asset unici: ${uniqueAssets.length}`);
    for (const asset of uniqueAssets) {
        console.log(`      - "${asset.name}" (chunk: ${asset.chunkIndices.join(', ')})`);
    }
    ctx.uniqueAssets = uniqueAssets;
    ctx.logs.push(`Fase2: ${uniqueAssets.length} asset unici`);
    return ctx;
}

module.exports = phase2Dedup;