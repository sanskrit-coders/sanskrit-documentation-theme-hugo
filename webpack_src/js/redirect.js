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


export function redirectToPage(url, manualRedirectionDiv) {
    if (manualRedirectionDiv) {
        manualRedirectionDiv.innerHTML = `Redirecting <a href='${url}'>here</a>`;
    }
    if (url) {
        window.location.replace(url);
    }
}

import * as dirTree from "./dirTree";

export function redirectToRandomPage(weightingFn, manualRedirectionDiv, dryRun) {
    const urls = dirTree.getAllPaths(pageRelUrlTree);
    const weights = urls.map(weightingFn);
    // console.debug(urls, weights);
    let randomUrl = baseURL + urls[weightedRandom(weights)];
    randomUrl = randomUrl.replace("//", "/");
    console.log(randomUrl);
    if (!dryRun) {
        redirectToPage(randomUrl, manualRedirectionDiv);
    }
}
