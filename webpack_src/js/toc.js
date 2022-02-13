
function get_toc_item_id(header_id) {
    return "toc_item_" + header_id;
}

export function updateToc(options) {
    console.info("Setting up TOC for " + document.location);
    var defaults = {
      noBackToTopLinks: false,
      title: '',
      minimumHeaders: 2,
      headers: 'h2,h3,h4,h5,h6'
    },
    settings = $.extend(defaults, options);

    console.log(`Table of contents for ${document.location}`)
    // console.debug(settings);
    var headers = $(settings.headers);
    console.debug("headers.length", headers.length);
    if (headers.length < settings.minimumHeaders) {
      console.log(`Too few headers ${headers.length} < ${settings.minimumHeaders}. Returning.`);
      $("#toc_card").hide();
      return;
    }

    var get_level = function(ele) { return parseInt(ele.nodeName.replace("H", ""), 10); }
    var highest_level = headers.map(function(_, ele) { return get_level(ele); }).get().sort()[0];
    let liClass = "list-group-item-primary"; // list-group-item-primary is a bootstrap class.
    let ulClass = "list pl2";
    var level = get_level(headers[0]),
      this_level,
      html = settings.title + `<ul class='${ulClass}'>`;
    headers.on('click', function() {
      if (!settings.noBackToTopLinks) {
        window.location.hash = this.id;
      }
    })
    .addClass('clickable-header')
    .each(function(_, header) {
      this_level = get_level(header);
      if (!settings.noBackToTopLinks && this_level === highest_level) {
        $(header).addClass('top-level-header');
      }
      var toc_item_id = get_toc_item_id(header.id);
      if (this_level === level) // same level as before; same indenting
        html += `<li id='${toc_item_id}' class="${liClass}"><a href='#${header.id}'>${header.innerText}</a>`;
      else if (this_level <= level){ // higher level than before; end parent ol
        for(let i = this_level; i < level; i++) {
          html += `</li></ul>`
        }
        html += `<li id='${toc_item_id}' class="${liClass}"><a href='#${header.id}'>${header.innerText}</a>`;
      }
      else if (this_level > level) { // lower level than before; expand the previous to contain a ol
        for(let i = this_level; i > level; i--) {
          html += `<ul class='${ulClass}'>`;
          if(i == level + 1) {
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
    $("#toc_ul").html(html);
    $("#toc_card").show();
    // console.log($("#toc_ul"));
    // resetNavgocoMenu();
    // Finally, set up navgoco options.
};


function returnToTopHandler(toc_item_id) {
    // First, set up the right selections in the table-of-contents menu.
    // So, the user can follow the trail of highlights menu items and expand the menu items till he reaches the appropriate level.
    var itemToActivate = undefined;
    document.getElementById("toc_header").setAttribute("open", "");
    // console.debug(toc_item_id, $("#toc_ul").find("li"));
    $("#toc_ul").find("li").each(function (liIndex, liElement) {
        // console.debug(liIndex, liElement, toc_item_id);
        if (liElement.id == toc_item_id) {
            itemToActivate = $(this);
        } else {
            $(this).removeClass("active");
        }
    });
    itemToActivate.addClass("active");
    itemToActivate.parents("li").addClass("active"); // This call is ineffective for some reason.

    // Now scroll up.
    $([document.documentElement, document.body]).animate({
        scrollTop: $("[id='" + toc_item_id + "']").offset().top
    }, 100);
}


function setUpNavigationLinks(headers) {
  headers.each(function () {
    var header = $(this);
    let ancestorIncludedPost = header.closest(".included-post");
    var navDiv = header.next();
    if (!navDiv.hasClass("section-nav")) {
        navDiv = header.children(".secion-nav").last();
        // console.debug("last child of header", navDiv);
    }
    if (!navDiv.hasClass("section-nav")) {
        navDiv = $("<div class=\"section-nav row float-right noPrint\" style=\"text-align:right;\"></div><br>");
        header.append(navDiv);
    }
    
    let up_button_id = `toc_up_${header.attr('id')}`;
    // console.debug($(`#${up_button_id}`).length, navDiv);
    if ($(`#${up_button_id}`).length == 0){
        // There is a javascript click listener (defined later in this file) for the below to scroll up.
        var returnToTopLink = $(`<div id="${up_button_id}" class="icon-arrow-up back-to-top btn btn-secondary">Up↑</div>`);
        var toc_item_id = get_toc_item_id(header.attr('id'));
        returnToTopLink.click(function() {returnToTopHandler(toc_item_id)});
        }
        navDiv.prepend(returnToTopLink);
    });
}

