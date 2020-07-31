// Replacing the not-very-random default with https://github.com/davidbau/seedrandom .
import seedrandom from "seedrandom";
let randomGenerator = seedrandom();


function weightedRandom(weights) {
    var totalWeight = 0,
        i, random;

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


export function redirectToPage(url, manualRedirectionDiv, dryRun) {
    if (manualRedirectionDiv) {
        // TODO: The below has no visible effect.
        manualRedirectionDiv.innerHTML = `Redirecting <a href='${url}'>here</a>`;
    }
    if (url && !dryRun) {
        window.location.replace(url);
    }
}

import * as dirTree from "./dirTree";

export function redirectToRandomPage(weightingFn, manualRedirectionDiv, dryRun) {
    const urls = dirTree.getAllPaths(pageRelUrlTree);
    const weights = urls.map(weightingFn);
    // console.debug(urls, weights);
    let randomUrlRelative = urls[weightedRandom(weights)];
    if (!randomUrlRelative) {
        console.warn("Misfire? No random url found");
        return;
    }
    console.debug(randomUrlRelative);
    if (randomUrlRelative.startsWith("/") ) {
        randomUrlRelative = randomUrlRelative.replace("/", "", 1)
    }
    let randomUrl = baseURL + randomUrlRelative;
    console.log(randomUrlRelative, randomUrl, manualRedirectionDiv);
    redirectToPage(randomUrl, manualRedirectionDiv, dryRun);
}
