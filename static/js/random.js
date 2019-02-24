function weightedRandom(weights) {
    var totalWeight = 0,
        i, random;

    for (i = 0; i < weights.length; i++) {
        totalWeight += weights[i];
    }

    random = Math.random() * totalWeight;

    for (i = 0; i < weights.length; i++) {
        if (random < weights[i]) {
            return i;
        }

        random -= weights[i];
    }

    return -1;
};


function redirectToRandomPage(weightingFn) {
    var urls = Object.getOwnPropertyNames(pageUrlToParams);
    var weights = urls.map(weightingFn);
    var randomUrl = baseURL + urls[weightedRandom(weights)];
    console.log(randomUrl);
// alert(randomUrl);
    if (randomUrl) {
        window.location.replace(randomUrl);
    }
}
