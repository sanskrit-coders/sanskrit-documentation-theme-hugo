// Replacing the not-very-random default with https://github.com/davidbau/seedrandom .
import seedrandom from "seedrandom";
let randomGenerator = seedrandom();


function weightedRandom(weights) {
    var totalWeight = 0, i, random;

    for (i = 0; i < weights.length; i++) {
        totalWeight += weights[i];
    }
    console.debug("totalWeight :", totalWeight);
    random = randomGenerator() * totalWeight;
    for (i = 0; i < weights.length; i++) {
        if (random < weights[i]) {
            console.debug(i);
            return [i, totalWeight];
        }
        random -= weights[i];
    }
    return [-1, totalWeight];
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

export async function redirectToRandomPage(weightingFn, manualRedirectionDiv, dryRun) {
    await dirTree.populateTree();
    const urls = dirTree.getAllPaths(pageRelUrlTree);
    // console.debug("All urls", urls, pageRelUrlTree);
    const weights = urls.map(weightingFn);
    var urlWeights = [];
    urls.forEach((url, i) => urlWeights[i] = [url, weights[i]]);
    // console.debug(urlWeights, urlWeights.filter((value, index, array) => {return value[0].startsWith("/mantraH/AdityaH/");}));
    let nonZeroUrlWeights = urlWeights.filter((value, index, array) => {return value[1] > 0});
    let nonZeroWeights = nonZeroUrlWeights.map(x => x[1]);
    if (nonZeroWeights.length == 0) {
        console.warn("Did not get any non zero weights!");
        return;
    }
    // console.debug(nonZeroUrlWeights, nonZeroWeights);
    let [randomIndex, totalWeight] = weightedRandom(nonZeroWeights);
    let randomUrlRelative = nonZeroUrlWeights[randomIndex][0];
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
    redirectToPage(randomUrl, manualRedirectionDiv, dryRun, `"urlWeight=${urlWeight}&totalWeight=${totalWeight}"`);
}
