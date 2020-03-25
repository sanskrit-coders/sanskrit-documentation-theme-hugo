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
    console.assert(prefix.endsWith("/"));
    let nonDirPageKeys = getNonDirPageKeys(tree);
    let paths = nonDirPageKeys.map(x => `${prefix}${x}/`);
    let childDirKeys = getChildDirKeys(tree);
    childDirKeys.forEach(childDirKey => {
        paths = paths.concat(getAllPaths(tree[childDirKey], `${prefix}${childDirKey}/`));
    });
    return paths;
}

export function getParentDirPath(relUrl) {
    return "/" + relUrl.split("/").filter(x => x.length > 0).slice(0, -1).join("/") + "/";
}

export function getItemNameNoPath(relUrl) {
    return relUrl.split("/").filter(x => x.length > 0).slice(-1)[0];
}

export function getNextPage(relUrl, skipDir) {
    var tree = getChildTree(relUrl);
    console.debug(relUrl, tree);
    if (getPageKeys(tree) == 0 || skipDir) {
        tree = getChildTree(getParentDirPath(relUrl));
        const pageKeys = getPageKeys(tree);
        // console.log(pageKeys);
        const currentItemPosition = pageKeys.indexOf(getItemNameNoPath(relUrl));
        if (currentItemPosition == pageKeys.length - 1) {
            console.debug("Moving a directory up.");
            return getNextPage(getParentDirPath(getParentDirPath(relUrl)), true);
        } else {
            console.debug("We'll get a sibling page");
            return tree[pageKeys[currentItemPosition + 1]];
        }
    } else {
        console.debug("We'll get a child page");
        return tree[getPageKeys(tree)[0]];
    }
    // TODO : To be debugged.
}