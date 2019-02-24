function redirectToRandomPage(weightingFn) {
    var urls = Object.getOwnPropertyNames(pageUrlToParams);
    var weights = urls.map(weightingFn);
    var randomMantraUrl = baseURL + filteredUrls[weightedRandom(weights)];
    console.log(randomMantraUrl);
// alert(randomMantraUrl);
    if (randomMantraUrl) {
        window.location.replace(randomMantraUrl);
    }
}
