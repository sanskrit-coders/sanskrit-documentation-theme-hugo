import * as utils from './utils';

export let pageRelUrlTreeMETAkey = "__meta";
const SORTED_KEYS_SYM = Symbol("sortedKeys");
const titleCollator = new Intl.Collator();
let populatePromise = null;

function getNormalizedBaseUrl() {
    return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
}

export function addRelUrlToTree(item, pageParams) {
    var parts = item.split("/").filter(x => x.length > 0);
    // Navigate with the prefix into the tree. 
    var cursor = pageRelUrlTree;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!cursor[part]) cursor[part] = {};
        cursor = cursor[part];
    }
    cursor[pageRelUrlTreeMETAkey] = pageParams;
}

async function fetchIndexJsonData() {
    if (typeof window !== "undefined" && window.__sdIndexPromise) {
        try {
            return await window.__sdIndexPromise;
        } catch (err) {
            // Fall through to direct fetch/XHR below if prefetch failed.
            console.debug("Prefetched index failed, retrying:", err);
        }
    }
    const indexUrl = `${getNormalizedBaseUrl()}index.json`;
    if (typeof location !== "undefined" && location.protocol === "file:") {
        const text = await utils.getAjaxResponsePromise(indexUrl);
        return JSON.parse(text);
    }
    const response = await fetch(indexUrl);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
}

export async function populateTree() {
    if (Object.keys(pageRelUrlTree).length > 0) {
        return;
    }
    if (populatePromise) {
        return populatePromise;
    }
    populatePromise = (async () => {
        try {
            const data = await fetchIndexJsonData();
            const normBase = getNormalizedBaseUrl();

            for (let i = 0; i < data.length; i++) {
                const pageParams = data[i];
                const relUrl = pageParams["relUrl"] || "";
                pageParams["absUrl"] = normBase + relUrl.replace(/^\//, "");
                addRelUrlToTree(relUrl, pageParams);
            }
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            populatePromise = null;
        }
    })();
    return populatePromise;
}

export function getChildTree(relativeUrl) {
    var parts = relativeUrl.split("/").filter(x => x.length > 0);
    var cursor = pageRelUrlTree;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!cursor[part]) {
            return {};
        }
        cursor = cursor[part];
    }
    return cursor;
}

export function getPageParams(url) {
    let pageParams = getChildTree(url)[pageRelUrlTreeMETAkey] || {};
    return pageParams;
}

export function getNonMetaNodeKeys(tree) {
    return Object.keys(tree).filter(x => x != pageRelUrlTreeMETAkey);
}


function alphabeticalTitle(tree, a) {
    let title = tree[a][pageRelUrlTreeMETAkey].title || "";
    if (tree[a][pageRelUrlTreeMETAkey].lastmod) {
        title = `${tree[a][pageRelUrlTreeMETAkey].lastmod} ${title}`;
    }
    title = title.replace(/^\+* */, "");
    return title;
}


export function getPageKeys(tree) {
    if (tree[SORTED_KEYS_SYM]) {
        return tree[SORTED_KEYS_SYM];
    }
    function titleSorter(a, b) {
        let titleA = alphabeticalTitle(tree, a);
        let titleB = alphabeticalTitle(tree, b);
        return titleCollator.compare(titleA, titleB);
    }
    let keys = getNonMetaNodeKeys(tree);
    keys = keys.filter(x => pageRelUrlTreeMETAkey in tree[x]);
    keys.sort(titleSorter);
    tree[SORTED_KEYS_SYM] = keys;
    return keys;
}

export function isDirKey(tree, key) {
  return getNonMetaNodeKeys(tree[key]).length > 0;
}

export function getNonDirPageKeys(tree) {
    return getPageKeys(tree).filter(x => !isDirKey(tree, x));
}

export function getChildDirKeys(tree) {
    return getPageKeys(tree).filter(x => isDirKey(tree, x));
}

export function getAllPaths(tree, prefix_in) {
    var prefix = prefix_in || "/";
    console.assert(prefix.endsWith("/"));
    let nonDirPageKeys = getNonDirPageKeys(tree);
    let paths = nonDirPageKeys.map(x => `${prefix}${x}/`);
    let childDirKeys = getChildDirKeys(tree);
    for (let i = 0; i < childDirKeys.length; i++) {
        const childDirKey = childDirKeys[i];
        const subPaths = getAllPaths(tree[childDirKey], `${prefix}${childDirKey}/`);
        for (let j = 0; j < subPaths.length; j++) {
            paths.push(subPaths[j]);
        }
    }
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
    const currentItemPosition = pageKeys.indexOf(getItemNameNoPath(relUrl));
    if (currentItemPosition == pageKeys.length - 1) {
        console.debug("Moving a directory up.");
        return getNextPage(getParentDirPath(getParentDirPath(relUrl)), getParentDirPath(relUrl));
    } else if (currentItemPosition == -1) {
        return tree;
    } 
    else {
        console.debug("We'll get a sibling page - ", pageKeys[currentItemPosition + 1], tree);
        return tree[pageKeys[currentItemPosition + 1]];
    }
}

function getParentTree(relUrl) {
    let parentDirPath = getParentDirPath(relUrl);
    let tree = getChildTree(parentDirPath);
    // The below is possible in case of test pages in directories without _index.md
    while(tree[pageRelUrlTreeMETAkey] == undefined) {
        const nextParent = getParentDirPath(parentDirPath);
        if (nextParent === parentDirPath) break;
        parentDirPath = nextParent;
        tree = getChildTree(parentDirPath);
    }
    return tree;
}

export function getNextPage(relUrl, startUrl) {
    var tree = getChildTree(relUrl);
    if (getPageKeys(tree).length == 0) {
        let parentPath = getParentDirPath(relUrl);
        if (parentPath == relUrl) {
            console.log("No next page found!");
            return "";
        }
        tree = getParentTree(relUrl);
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
        const lastKey = pageKeys[pageKeys.length - 1];
        return getLastPage(tree[lastKey]);
    }
}

export function getPreviousPage(relUrl) {
    let tree = getParentTree(relUrl);
    if (relUrl == "/") {
        return tree;
    }
    const pageKeys = getPageKeys(tree);
    const currentItemPosition = pageKeys.indexOf(getItemNameNoPath(relUrl));
    if (currentItemPosition == 0) {
        console.debug("Moving a directory up.");
        return tree;
    } else if (currentItemPosition == -1) {
        console.debug(pageKeys, getItemNameNoPath(relUrl));
        return tree;
    }
    else {
        console.debug("We'll get a sibling page", pageKeys[currentItemPosition - 1]);
        return getLastPage(tree[pageKeys[currentItemPosition - 1]]);
    }
}

export function setAnchor(element, tree, textPrefix="", maxLength = 10) {
    if (!element || tree == "" || !tree) {
        return;
    }
    if (tree[pageRelUrlTreeMETAkey] == undefined) {
        console.warn("Something is weird: cannot find %s in tree (eg. a directory without an _index.md)", pageRelUrlTreeMETAkey, tree);
        return;
    }
    element.setAttribute("href", tree[pageRelUrlTreeMETAkey].absUrl);
    let title = tree[pageRelUrlTreeMETAkey].title;
    if (title != undefined && title.length > maxLength) {
        title = title.substr(0, maxLength);
        title = title + "…";
    }
    element.innerHTML = element.innerHTML.replace("###", title);
}