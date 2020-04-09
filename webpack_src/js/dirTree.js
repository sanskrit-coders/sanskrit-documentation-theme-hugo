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
    function titleSorter(a, b) {
        let titleA = tree[a][pageRelUrlTreeMETAkey].title;
        let titleB = tree[b][pageRelUrlTreeMETAkey].title;
        // console.debug(titleA, titleB, titleA.localeCompare(titleB));
        if (titleA === undefined || titleB === undefined) {
            return false;
        }
        else return titleA.localeCompare(titleB);
    }
    return getNonMetaNodeKeys(tree).filter(x => pageRelUrlTreeMETAkey in tree[x]).sort(titleSorter);
}

export function getNonDirPageKeys(tree) {
    return getPageKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length == 0);
}

export function getChildDirKeys(tree) {
    return getPageKeys(tree).filter(x => getNonMetaNodeKeys(tree[x]).length > 0);
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
    return ("/" + relUrl.split("/").filter(x => x.length > 0).slice(0, -1).join("/") + "/").replace("//", "/");
}

export function getItemNameNoPath(relUrl) {
    return relUrl.split("/").filter(x => x.length > 0).slice(-1)[0];
}

function getNextPageFromTreePosition(tree, relUrl) {
    const pageKeys = getPageKeys(tree);
    // console.log(pageKeys);
    const currentItemPosition = pageKeys.indexOf(getItemNameNoPath(relUrl));
    if (currentItemPosition == pageKeys.length - 1) {
        console.debug("Moving a directory up.");
        return getNextPage(getParentDirPath(getParentDirPath(relUrl)), getParentDirPath(relUrl));
    } else {
        console.debug("We'll get a sibling page");
        return tree[pageKeys[currentItemPosition + 1]];
    }
}

export function getNextPage(relUrl, startUrl) {
    var tree = getChildTree(relUrl);
    // console.debug(relUrl, tree);
    if (getPageKeys(tree).length == 0) {
        tree = getChildTree(getParentDirPath(relUrl));
        return getNextPageFromTreePosition(tree, relUrl);
    } else {
        console.debug("We'll get a child page");
        if (startUrl === undefined) {
            return tree[getPageKeys(tree)[0]];
        } else {
            return getNextPageFromTreePosition(tree, startUrl);
        }
    }
}

export function getLastPage(tree) {
    const pageKeys = getPageKeys(tree);
    if (pageKeys.length == 0) {
        return tree;
    } else {
        const lastKey = pageKeys.slice(-1)[0];
        return getLastPage(tree[lastKey]);
    }
}

export function getPreviousPage(relUrl) {
    const tree = getChildTree(getParentDirPath(relUrl));
    if (relUrl == "/") {
        return tree;
    }
    // console.debug(relUrl, tree);
    const pageKeys = getPageKeys(tree);
    // console.log(pageKeys);
    const currentItemPosition = pageKeys.indexOf(getItemNameNoPath(relUrl));
    if (currentItemPosition == 0) {
        console.debug("Moving a directory up.");
        return tree;
    } else {
        console.debug("We'll get a sibling page");
        return getLastPage(tree[pageKeys[currentItemPosition - 1]]);
    }
}

export function setAnchor(element, tree, textPrefix="") {
    element.setAttribute("href", tree[pageRelUrlTreeMETAkey].absUrl);
    element.innerHTML = element.innerHTML.replace("###", tree[pageRelUrlTreeMETAkey].title);
}
