let pageRelUrlTreeMETAkey = "__meta";


export function addRelUrlToTree(item, pageParams) {
    // console.debug(item, pageParams);
    var parts = item.split("/").filter(x => x.length > 0);
    // Navigate with the prefix into the tree. 
    var cursor = pageRelUrlTree;
    parts.forEach(function(part){
        if(!cursor[part]) cursor[part] = {};
        cursor = cursor[part];
    });
    cursor[pageRelUrlTreeMETAkey] = pageParams;
}

export function getChildTree(relativeUrl) {
    var parts = relativeUrl.split("/").filter(x => x.length > 0);
    var cursor = pageRelUrlTree;
    parts.forEach(function(part){
        if(!cursor[part]) cursor[part] = {};
        cursor = cursor[part];
    });
    return cursor;
}

export function getPageParams(url) {
    let pageParams = getChildTree(url)[pageRelUrlTreeMETAkey] || {};
    return pageParams;
}

export function getNonMetaNodeKeys(tree) {
    return Object.keys(tree).filter(x => x != pageRelUrlTreeMETAkey);
}

export function getPageKeys(tree) {
    return getNonMetaNodeKeys(tree).filter(x => pageRelUrlTreeMETAkey in tree[x]);
}

export function getNonDirPageKeys(tree) {
    return getPageKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length == 0);
}

export function getChildDirKeys(tree) {
    return getNonMetaNodeKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length > 0);
}

export function getAllPaths(tree, prefix_in) {
    var prefix = prefix_in  || "/";
    let nonDirPageKeys = getNonDirPageKeys(tree);
    let paths = nonDirPageKeys.map(x => `${prefix}${x}/`);
    let childDirKeys = getChildDirKeys(tree);
    childDirKeys.forEach(childDirKey => {
        paths = paths.concat(getAllPaths(tree[childDirKey], `${prefix}${childDirKey}/`));
    });
    return paths;
}

