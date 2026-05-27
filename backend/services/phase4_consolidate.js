function phase4Consolidate(ctx) {
    const { enrichedAssets } = ctx;
    console.log("\n📍 FASE 4: Revisione consolidata");
    const finalMap = new Map();
    for (const asset of enrichedAssets) {
        const key = asset.name.toLowerCase();
        if (!finalMap.has(key)) {
            finalMap.set(key, asset);
        } else {
            const existing = finalMap.get(key);
            if (asset.description && asset.description.length > (existing.description || '').length) {
                finalMap.set(key, asset);
            }
        }
    }
    let finalAssets = Array.from(finalMap.values());
    finalAssets = finalAssets.filter(a => a.name && a.name.length > 2 && a.name !== "Asset");
    console.log(`   ✅ Asset finali: ${finalAssets.length} (da ${enrichedAssets.length} arricchiti)`);
    ctx.finalAssets = finalAssets;
    ctx.logs.push(`Fase4: consolidati ${finalAssets.length} asset finali`);
    return ctx;
}

module.exports = phase4Consolidate;