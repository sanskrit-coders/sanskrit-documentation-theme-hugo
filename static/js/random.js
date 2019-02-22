function redirectToRandomPage(filterFn) {
    var allSidebarUrls = [];
    $("#displayed_sidebar li:not(:has(ul)) a").each(function() {allSidebarUrls.push($(this).attr("href"));})

    var filteredUrls = allSidebarUrls.filter(filterFn);
    var randomMantraUrl = filteredUrls[Math.floor(Math.random()*filteredUrls.length)];
    console.log(randomMantraUrl);
// alert(randomMantraUrl);
    if (randomMantraUrl) {
        window.location.replace(randomMantraUrl);
    }
}
