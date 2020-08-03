// Replacing the not-very-random default with https://github.com/davidbau/seedrandom .
import seedrandom from "seedrandom";
let randomGenerator = seedrandom();


function weightedRandom(weights) {
    var totalWeight = 0, i, random;

    for (i = 0; i < weights.length; i++) {
        totalWeight += weights[i];
    }
    random = randomGenerator() * totalWeight;
    for (i = 0; i < weights.length; i++) {
        if (random < weights[i]) {
            return i;
        }
        random -= weights[i];
    }
    return -1;
}


export function redirectToPage(url, manualRedirectionDiv, dryRun, debugInfo="") {
    if (manualRedirectionDiv) {
        // TODO: The below has no visible effect.
        manualRedirectionDiv.innerHTML = `Redirecting <a href='${url}'>here</a>`;
    }
    if (url && !dryRun) {
        window.location.replace(url + `?debugInfo=${debugInfo}`);
    }
}

import * as dirTree from "./dirTree";

export function redirectToRandomPage(weightingFn, manualRedirectionDiv, dryRun) {
    const urls = dirTree.getAllPaths(pageRelUrlTree);
    // console.debug(urls.filter(url => url.startsWith("/m")));
    const weights = urls.map(weightingFn);
    var urlWeights = [];
    urls.forEach((url, i) => urlWeights[i] = [url, weights[i]]);
    // console.debug(urlWeights, urlWeights.filter((value) => {value[1] > 0}));
    let randomUrlRelative = urls[weightedRandom(weights)];
    if (!randomUrlRelative) {
        console.warn("Misfire? No random url found");
        return;
    }
    let urlWeight = weightingFn(randomUrlRelative);
    console.log(randomUrlRelative, urlWeight);
    if (randomUrlRelative.startsWith("/") ) {
        randomUrlRelative = randomUrlRelative.replace("/", "", 1)
    }
    let randomUrl = baseURL + randomUrlRelative;
    // console.log(randomUrlRelative, randomUrl, manualRedirectionDiv);
    redirectToPage(randomUrl, manualRedirectionDiv, dryRun, urlWeight);
}
