
function getTocItemId(header_id) {
    return "toc_item_" + header_id;
}

export function updateToc(options) {
    console.info("Setting up TOC for " + document.location);
    var defaults = {
        noBackToTopLinks: false,
        title: '',
        minimumHeaders: 2,
        headers: 'h2,h3,h4,h5,h6'
    };
    var settings = Object.assign({}, defaults, options);

    console.log(`Table of contents for ${document.location}`);
    // console.debug(settings);
    var headers = document.querySelectorAll(settings.headers);
    console.debug("headers.length", headers.length);
    if (headers.length < settings.minimumHeaders) {
        console.log(`Too few headers ${headers.length} < ${settings.minimumHeaders}. Returning.`);
        let tocCard = document.getElementById("toc_card");
        if (tocCard) tocCard.style.display = "none";
        return;
    }

    var get_level = function(ele) { return parseInt(ele.nodeName.replace("H", ""), 10); };
    var highest_level = Array.from(headers)
        .map(function(ele) { return get_level(ele); })
        .sort()[0];
    let liClass = "list-group-item-primary"; // list-group-item-primary is a bootstrap class.
    let ulClass = "list pl2";
    var level = get_level(headers[0]);
    var this_level;
    var html = settings.title + `<ul class='${ulClass}'>`;

    headers.forEach(header => {
        header.addEventListener('click', function() {
            if (!settings.noBackToTopLinks) {
                window.location.hash = this.id;
            }
        });

        header.classList.add('clickable-header');

        this_level = get_level(header);
        if (!settings.noBackToTopLinks && this_level === highest_level) {
            header.classList.add('top-level-header');
        }
        var toc_item_id = getTocItemId(header.id);
        if (this_level === level) { // same level as before; same indenting
            html += `<li id='${toc_item_id}' class="${liClass}"><a href='#${header.id}'>${header.innerText}</a>`;
        } else if (this_level <= level) { // higher level than before; end parent ul
            for(let i = this_level; i < level; i++) {
                html += `</li></ul>`;
            }
            html += `<li id='${toc_item_id}' class="${liClass}"><a href='#${header.id}'>${header.innerText}</a>`;
        } else if (this_level > level) { // lower level than before; expand the previous to contain an ul
            for(let i = this_level; i > level; i--) {
                html += `<ul class='${ulClass}'>`;
                if (i == level + 1) {
                    html +=  `<li id='${toc_item_id}' class="${liClass}">`;
                } else {
                    html += `<li class="${liClass}">`;
                }
            }
            // console.debug("header is ", header);
            html += `<a href='#${header.id}'>${header.innerText}</a>`;
        }
        level = this_level; // update for the next one
    });

    html += "</ul>";
    setUpNavigationLinks(headers);
    // Some layouts (eg. 404.html) don't have a TOC card.
    let tocUl = document.getElementById("toc_ul");
    if (tocUl) tocUl.innerHTML = html;
    let tocCard = document.getElementById("toc_card");
    if (tocCard) tocCard.style.display = "block";
    // console.log(document.getElementById("toc_ul"));
    // resetNavgocoMenu();
    // Finally, set up navgoco options.
}



function returnToTopHandler(toc_item_id) {
    // First, set up the right selections in the table-of-contents menu.
    // So, the user can follow the trail of highlights menu items and expand the menu items till he reaches the appropriate level.
    var itemToActivate = undefined;
    document.getElementById("toc_header").setAttribute("open", "");
    // console.debug(toc_item_id, document.querySelectorAll("#toc_ul li"));
    document.querySelectorAll("#toc_ul li").forEach(function(liElement, liIndex) {
        // console.debug(liIndex, liElement, toc_item_id);
        if (liElement.id === toc_item_id) {
            itemToActivate = liElement;
        } else {
            liElement.classList.remove("active");
        }
    });
    if (!itemToActivate) {
        return;
    }

    itemToActivate.classList.add("active");
    // Also mark the ancestor <li> elements as active.
    for (let ancestor = itemToActivate.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === "LI") {
            ancestor.classList.add("active");
        }
    }

    // Now scroll up.
    document.documentElement.scrollTop = document.body.scrollTop = document.getElementById(toc_item_id).offsetTop;
}


function setUpNavigationLinks(headers) {
    headers.forEach(function(header, index) {
        let navDiv = header.nextElementSibling;
        if (!navDiv || !navDiv.classList.contains("section-nav")) {
            let childNavDivs = header.querySelectorAll(":scope > .section-nav");
            navDiv = childNavDivs.length ? childNavDivs[childNavDivs.length - 1] : null;
        }
        if (!navDiv) {
            navDiv = document.createElement("div");
            navDiv.className = "section-nav row float-right noPrint";
            navDiv.style.textAlign = "right";
            header.appendChild(navDiv);
        }

        let up_button_id = `toc_up_${header.id}`;
        // console.debug(document.getElementById(up_button_id), navDiv);
        if (!document.getElementById(up_button_id)) {
            // There is a javascript click listener (defined later in this file) for the below to scroll up.
            let returnToTopLink = document.createElement("div");
            returnToTopLink.id = up_button_id;
            returnToTopLink.className = "header-nav back-to-top btn btn-secondary";
            returnToTopLink.textContent = "↑";
            let toc_item_id = getTocItemId(header.id);
            returnToTopLink.addEventListener('click', function() { returnToTopHandler(toc_item_id); });
            navDiv.prepend(returnToTopLink);
        }

        let next_button_id = `toc_next_${header.id}`;
        if (index !== headers.length - 1 && !document.getElementById(next_button_id)) {
            // There is a javascript click listener (defined later in this file) for the below to scroll up.
            let nextHeader = headers[index + 1];
            // console.log(nextHeader);
            let nextHeading_id = nextHeader.id;
            let goNextLink = document.createElement("div");
            goNextLink.id = next_button_id;
            goNextLink.className = "header-nav btn btn-secondary";
            goNextLink.innerHTML = `<a href="#${nextHeading_id}">⤵️</a>`;
            // goNextLink.addEventListener('click', function() { returnToTopHandler(toc_item_id); });
            navDiv.prepend(goNextLink);
        }

        let prev_button_id = `toc_prev_${header.id}`;
        if (index !== 0 && !document.getElementById(prev_button_id)) {
            // There is a javascript click listener (defined later in this file) for the below to scroll up.
            let prevHeader = headers[index - 1];
            // console.log(prevHeader);
            let prevHeading_id = prevHeader.id;
            let goPrevLink = document.createElement("div");
            goPrevLink.id = prev_button_id;
            goPrevLink.className = "header-nav btn btn-secondary";
            goPrevLink.innerHTML = `<a href="#${prevHeading_id}">⤴️</a>`;
            // goNextLink.addEventListener('click', function() { returnToTopHandler(toc_item_id); });
            navDiv.prepend(goPrevLink);
        }
    });
}
