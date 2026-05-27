function getCategoryNames(taxonomy) {
    return taxonomy.categories.map(c => c.name);
}

function getSubcategoryNames(taxonomy, categoryName) {
    const cat = taxonomy.categories.find(c => c.name === categoryName);
    return cat ? cat.subcategories.map(sc => sc.name) : [];
}

function getCategoryDescription(taxonomy, categoryName) {
    const cat = taxonomy.categories.find(c => c.name === categoryName);
    return cat ? cat.description : '';
}

function getSubcategoryDescription(taxonomy, categoryName, subcategoryName) {
    const cat = taxonomy.categories.find(c => c.name === categoryName);
    if (!cat) return '';
    const sub = cat.subcategories.find(sc => sc.name === subcategoryName);
    return sub ? sub.description : '';
}

module.exports = {
    getCategoryNames,
    getSubcategoryNames,
    getCategoryDescription,
    getSubcategoryDescription
};