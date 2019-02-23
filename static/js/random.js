function redirectToRandomPage(filterFn) {
    var filteredUrls = Object.getOwnPropertyNames(pageUrlToParams).filter(filterFn);
    var randomMantraUrl = baseURL + filteredUrls[Math.floor(Math.random()*filteredUrls.length)];
    console.log(randomMantraUrl);
// alert(randomMantraUrl);
    if (randomMantraUrl) {
        window.location.replace(randomMantraUrl);
    }
}
