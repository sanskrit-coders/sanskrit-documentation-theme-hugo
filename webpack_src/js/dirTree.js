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

export async function populateTree() {
    if (Object.keys(pageRelUrlTree).length > 0) {
        return;
    }
    try {
        const response = await fetch(`${baseURL}/index.json`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        for (let pageParams of data) {
            // console.debug(pageParams);
            pageParams["absUrl"] = baseURL + pageParams["relUrl"];
            addRelUrlToTree(pageParams["relUrl"], pageParams);
            // if (pageParams["relUrl"].includes("piba-somam-mahAvairAjam")) {
            //     console.debug(getChildTree(pageParams["relUrl"]));
            // }
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }

}

export function getChildTree(relativeUrl) {
    var parts = relativeUrl.split("/").filter(x => x.length > 0);
    var cursor = pageRelUrlTree;
    parts.forEach(function(part){
        if(!cursor[part]) {
            cursor[part] = {};
        }
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
        if (tree[a][pageRelUrlTreeMETAkey].lastmod) {
            titleA = `${tree[a][pageRelUrlTreeMETAkey].lastmod} ${titleA}`;
        }
        let titleB = tree[b][pageRelUrlTreeMETAkey].title;
        if (tree[a][pageRelUrlTreeMETAkey].lastmod) {
            titleB = `${tree[a][pageRelUrlTreeMETAkey].lastmod} ${titleB}`;
        }
        // console.debug(titleA, titleB, titleA.localeCompare(titleB));
        if (titleA === undefined || titleB === undefined) {
            return false;
        }
        else return titleA.localeCompare(titleB);
    }
    return getNonMetaNodeKeys(tree).filter(x => pageRelUrlTreeMETAkey in tree[x]).sort(titleSorter);
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
    var prefix = prefix_in  || "/";
    console.assert(prefix.endsWith("/"));
    let nonDirPageKeys = getNonDirPageKeys(tree);
    // console.debug(nonDirPageKeys);
    let paths = nonDirPageKeys.map(x => `${prefix}${x}/`);
    let childDirKeys = getChildDirKeys(tree);
    childDirKeys.forEach(childDirKey => {
        paths = paths.concat(getAllPaths(tree[childDirKey], `${prefix}${childDirKey}/`));
    });
    // console.debug("paths - ", paths, tree);
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
    } else if (currentItemPosition == -1) {
        return tree;
    } 
    else {
        console.debug("We'll get a sibling page");
        return tree[pageKeys[currentItemPosition + 1]];
    }
}

function getParentTree(relUrl) {
    let parentDirPath = getParentDirPath(relUrl);
    let tree = getChildTree(parentDirPath);
    // The below is possible in case of test pages in directories without _index.md
    while(tree[pageRelUrlTreeMETAkey] == undefined) {
        parentDirPath = getParentDirPath(parentDirPath);
        tree = getChildTree(parentDirPath);
    }
    return tree;
}

export function getNextPage(relUrl, startUrl) {
    var tree = getChildTree(relUrl);
    // console.debug(relUrl, startUrl, tree);
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
        const lastKey = pageKeys.slice(-1)[0];
        return getLastPage(tree[lastKey]);
    }
}

export function getPreviousPage(relUrl) {
    let tree = getParentTree(relUrl);
    // console.debug(relUrl, getParentDirPath(relUrl), tree);
    if (relUrl == "/") {
        return tree;
    }
    // console.debug(relUrl, tree);
    const pageKeys = getPageKeys(tree);
    // console.debug(pageKeys, getItemNameNoPath(relUrl));
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
    if (tree == "") {
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
