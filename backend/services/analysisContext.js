class AnalysisContext {
    constructor(init = {}) {
        this.config = null;
        this.taxonomy = null;
        this.docFiles = [];
        this.contextFiles = [];
        this.fixedContextRich = '';
        this.chunks = [];
        this.rawOccurrences = [];
        this.uniqueAssets = [];
        this.enrichedAssets = [];
        this.finalAssets = [];
        this.logs = [];
        Object.assign(this, init);
    }
}

module.exports = { AnalysisContext };