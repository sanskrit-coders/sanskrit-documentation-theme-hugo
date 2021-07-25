/*
Code to handle includes. handleIncludes() is the entry point.
 */

import * as main from "./main";
import * as comments from "./comments";
import YAML from 'yaml'
import toml from 'toml';

import urljoin from 'url-join';
import showdown from "showdown";
import {updateToc} from "./toc";

var showdownConverter = new showdown.Converter();

function cleanId(x) {
    return x.replace(/[\p{P}\p{S}\s]+/gu, "_");
}

/*
Example: absoluteUrl("../subfolder1/divaspari/", "../images/forest-fire.jpg") == "../subfolder1/images/forest-fire.jpg"
WARNING NOTE: won't work with say base = "http://google.com" since it does not end with /. 
 */
function absoluteUrl(baseUrl, relative) {
    let baseUrlStr = baseUrl.toString();
    console.debug(baseUrl, relative);
    // console.trace();
    if (relative.startsWith("http") || relative.startsWith("file") || relative.startsWith("/")) {
        return relative;
    }

    let baseWithoutIntraPageLink = baseUrlStr.split("#")[0];
    var baseDirStack = baseWithoutIntraPageLink.toString().split("/");
    // console.debug(baseDirStack, urljoin(baseDirStack.join("/"), relative.toString()));
    baseDirStack.pop(); // remove current file name (or empty string)
    console.debug(baseDirStack, urljoin(baseDirStack.join("/"), relative.toString()));
    // (omit if "base" is the current folder without trailing slash)
    if (baseDirStack.length === 0) {
        return relative;
    }
    return urljoin(baseDirStack.join("/"), relative.toString());
}


function getCollapseStyle(jsIncludeJqueryElement) {
    var isCollapsed = jsIncludeJqueryElement.hasClass("collapsed");
    var collapseStyle = "collapse show";
    // console.debug(isCollapsed);
    if (isCollapsed) {
        collapseStyle = "collapse";
    }
    return collapseStyle;
}

// WHen you include html from one page within another, you need to fix image urls, anchor urls etc..
function fixIncludedHtml(includedPageRelativeUrl, html, newLevelForH1) {
    // We want to use jquery to parse html, but without loading images. Hence this.
    // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
    var virtualDocument = document.implementation.createHTMLDocument('virtual');
    // The surrounding divs are eliminated when the jqueryElement is created.
    var jqueryElement = $(comments.setInlineComments(`<div>${html}</div>`), virtualDocument);

    // console.debug(jqueryElement.html());
    // Remove some tags.
    jqueryElement.find("script").remove();
    jqueryElement.find("footer").remove();
    jqueryElement.find("#disqus_thread").remove();
    jqueryElement.find("#toc").remove();
    jqueryElement.find("#toc_header").remove();
    jqueryElement.find(".back-to-top").remove();

    jqueryElement.find('.js_include').each(function () {
        $(this).attr("url", absoluteUrl(includedPageRelativeUrl, $(this).attr("url")));
        if (newLevelForH1 < 1) {
            console.error("Ignoring invalid newLevelForH1: %d, using 6", newLevelForH1);
            newLevelForH1 = 6;
        }
        var includedPageNewLevelForH2 = parseInt($(this).attr("newLevelForH1"));
        if (includedPageNewLevelForH2 === undefined) {
            includedPageNewLevelForH2 = 6;
        }
        includedPageNewLevelForH2 = Math.min(6, ((includedPageNewLevelForH2 - 2) + newLevelForH1));
        $(this).attr("newLevelForH1", includedPageNewLevelForH2);
    });


    /*
    Fix headers in the included html so as to not mess up the table of contents
    of the including page.
    Adjusting the heading levels to retain substructure seems more complicated -
    getting the heading "under" which jsIncludeJqueryElement falls seems non-trivial.
     */
    var headers = jqueryElement.find(":header");
    if (headers.length > 0) {
        var id_prefix = cleanId(includedPageRelativeUrl);
        headers.replaceWith(function () {
            var headerElement = $(this);
            var hLevel = parseInt(headerElement.prop("tagName").substring(1));
            var hLevelNew = Math.min(6, newLevelForH1 - 1 + hLevel);
            var newId = id_prefix + "_" + cleanId(headerElement[0].id);
            let newHeaderEl = $("<h" + hLevelNew + " id='" + newId + "'/>").append(headerElement.contents());
            $.each(this.attributes, function() {
                if(this.name == 'id') return; // Avoid someone (optional)
                if(this.specified) newHeaderEl.attr(this.name, this.value);
            });
            console.debug(headerElement, newHeaderEl);
            return newHeaderEl;
        });
    }


    // Fix image urls.
    jqueryElement.find("img").each(function () {
        console.log(includedPageRelativeUrl, $(this).attr("src"), absoluteUrl(includedPageRelativeUrl, $(this).attr("src")));
        // console.log($(this).attr("src"))
        $(this).attr("src", absoluteUrl(includedPageRelativeUrl, $(this).attr("src")));
        // console.log($(this).attr("src"))
    });

    // Fix links.
    jqueryElement.find("a").each(function () {
        // console.debug($(this).html());
        var href = $(this).attr("href");
        if (href.startsWith("#")) {
            var headers = jqueryElement.find(":header");
            var new_href = href;
            if (headers.length > 0) {
                var id_prefix = headers[0].id;
                new_href = id_prefix + "_" + href.substr(1);
                // console.debug(new_href, id_prefix, href);
                jqueryElement.find(href).each(function () {
                    $(this).attr("id", new_href.substr(1));
                });
            }
            $(this).attr("href", new_href);
        } else {
            $(this).attr("href", absoluteUrl(includedPageRelativeUrl, href));
        }
    });

    return jqueryElement.html();
}

/* This function looks at the html of the page to be included, and changes it in the following ways:
- It fixes heading levels and figures out whether a title is needed.
- It fixes urls of images, links and includes to be relative to the includedPageUrl (which is inturn relative to the current page url), so that they work as expected when included in the given page.
*/

// An async function returns results wrapped in Promise objects.
async function processAjaxResponseHtml(responseHtml, jsIncludeJqueryElement, includedPageNewLevelForH1, includedPageRelativeUrl) {
    // We want to use jquery to parse html, but without loading images. Hence this.
    // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
    var virtualDocument = document.implementation.createHTMLDocument('virtual');
    let addTitle = jsIncludeJqueryElement.attr("includeTitle") || jsIncludeJqueryElement.attr("title");
    let virtualDocJq = $(`<div>${responseHtml}</div>`, virtualDocument);
    console.debug("virtualDocJq", virtualDocJq, responseHtml);
    var titleElements = virtualDocJq.find("h1");
    var title = jsIncludeJqueryElement.attr("title");
    if (!title && titleElements.length > 0) {
        // console.debug(titleElements[0]);
        title = titleElements[0].textContent;
    }
    let post_id = cleanId(includedPageRelativeUrl);
    let content_div_id = `included_content_${post_id}`;
    var contentHtml;
    var contentElements = virtualDocJq.find("#post_content");
    let collapseStyle = getCollapseStyle(jsIncludeJqueryElement);
    // console.log($(responseHtml, virtualDocument), contentElements);
    let contentInnerHtml = responseHtml;
    if (contentElements.length === 0) {
        let message = "Could not get \"post_content\" element.";
        // console.debug(message);
        contentInnerHtml = responseHtml;
    } else {
        // We don't want multiple post_content divs, hence we replace with an included-post-content div.
        contentInnerHtml = contentElements[0].innerHTML;
    }
    console.debug("contentInnerHtml", contentInnerHtml, contentElements);
    contentHtml = `<div class='included-post-content ${collapseStyle}' id="${content_div_id}">${contentInnerHtml}</div>`;


    var editLinkElements = $(responseHtml, virtualDocument).find("#editLink");
    var editLinkHtml = "";
    if (editLinkElements.length > 0) {
        // console.debug(editLinkElements);
        editLinkHtml = `<a class="btn btn-secondary" href="${editLinkElements.attr("href")}"><i class="fas fa-edit"></i></a>`
    }
    console.debug(addTitle, title, cleanId(title));
    var titleHtml = "<div></div>";
    if (addTitle && addTitle != "false") {
        titleHtml = fixIncludedHtml(includedPageRelativeUrl, `<h1 id='${cleanId(title)}'  data-toggle="collapse" href="#${content_div_id}" aria-expanded="true" aria-controls="${content_div_id}">${title}</h1>`, includedPageNewLevelForH1);
    }
    var collapseLink = `<a id="collapser_${post_id}" class="btn" data-toggle="collapse" href="#${content_div_id}" aria-expanded="true" aria-controls="${content_div_id}"><i class="fas fa-caret-down"></i></a>`;
    let popoutLink = `<a class='btn btn-secondary' href='${includedPageRelativeUrl}'><i class=\"fas fa-external-link-square-alt\"></i></a>`
    var titleRowHtml = `<div class='border d-flex justify-content-between' id="included_title_${post_id}">${titleHtml}<div class="section-nav row">${collapseLink}${popoutLink}${editLinkHtml}</div></div>`;
    var elementToInclude = $(`<div class='included-post border' id=\"included_post_${post_id}\"></div>`);
    elementToInclude.html(titleRowHtml + fixIncludedHtml(includedPageRelativeUrl, contentHtml, includedPageNewLevelForH1));
    return elementToInclude;
}

/*
Get included page url relative to the current page url.
* */
function getRelativeIncludedPageUrl(jsIncludeJqueryElement) {
    var includedPageUrl = jsIncludeJqueryElement.attr("url");
    if (includedPageUrl.endsWith("/")) {
        // In case one loads file://x/y/z/ rather than http://x/y/z/, the following is needed. 
        includedPageUrl = includedPageUrl + "index.html";
    }
    return includedPageUrl;
}

function markdownToHtml(markdownCode, includeElement) {
    let metadataSeparator = markdownCode.split("\n")[0].trim();
    // console.log(`metadataSeparator: ${metadataSeparator}`)
    let mdContent = markdownCode
    let metadataText = "";
    if (["---", "+++"].includes(metadataSeparator)) {
        metadataText = markdownCode.split(metadataSeparator)[1];
        mdContent = markdownCode.split(metadataSeparator).slice(2).join("+++");
    }

    let metadata = {"title": ""};
    // console.debug(metadataText);
    try {
        if (metadataSeparator == "---") {
            metadata = YAML.parse(metadataText);
        } else {
            metadata = toml.parse(metadataText);
            // console.debug(metadata);
        }
    } catch(err) {
        let message = `Metadata parse error. Check <a href='${includedPageUrl}'>file.</a>`;
        console.error(message);
        return message;
    }
    let fieldNames = includeElement.attr("fieldNames");
    if (fieldNames !== undefined) {
        let fieldData = fieldNames.split(",").map(fieldName => {
            // console.debug(fieldName, metadata);
            let data = metadata[fieldName];
            if (data !== undefined) {
                return data;
            } else {
                return "";
            }
        });
        mdContent = fieldData.join("\n\n") + "\n\n" + mdContent;
    }
    let responseHtml = `<h1>${metadata["title"]}</h1><div id="post_content">${showdownConverter.makeHtml(mdContent)}</div>`;
    return responseHtml;
}

async function fillJsInclude(jsIncludeJqueryElement, includedPageNewLevelForH1) {
    if (jsIncludeJqueryElement.html().trim() !== "") {
        console.warn("Refusing to refill element with non-empty html - ", jsIncludeJqueryElement);
        return "Already loaded";
    }
    console.info("Inserting include for ", jsIncludeJqueryElement);

    let includedPageUrl = getRelativeIncludedPageUrl(jsIncludeJqueryElement);
    if (includedPageUrl == "") {
        console.error("Invalid url!", jsIncludeJqueryElement);
        return "Invalid url!"
    }
    if (includedPageNewLevelForH1 === undefined) {
        includedPageNewLevelForH1 = parseInt(jsIncludeJqueryElement.attr("newLevelForH1"));
    }
    if (includedPageNewLevelForH1 === undefined) {
        includedPageNewLevelForH1 = 6;
    }
    // console.debug(includedPageNewLevelForH1);
    let getAjaxResponsePromise = $.ajax(includedPageUrl);

    function processingFn(response) {
        let responseHtml = response;
        if (includedPageUrl.endsWith(".md")) {
            responseHtml = markdownToHtml(response, jsIncludeJqueryElement);
        }
        return processAjaxResponseHtml(responseHtml, jsIncludeJqueryElement, includedPageNewLevelForH1, includedPageUrl);
    }

    return getAjaxResponsePromise.then(processingFn).then(function (contentElement) {
        // console.log(contentElement);
        jsIncludeJqueryElement.html(contentElement);
        // The below did not work - second level includes did not resolve.
        let secondLevelIncludes = jsIncludeJqueryElement.find('.js_include');
        if (secondLevelIncludes.length > 0) {
            return Promise.all(secondLevelIncludes.map(function () {
                console.debug("Secondary include: ", $(this));
                return fillJsInclude($(this));
            })).then(function () {
                return jsIncludeJqueryElement;
            });
        } else {
            return jsIncludeJqueryElement;
        }
    }).catch(async function (error) {
        var titleHtml = "";
        var title = "Missing page.";
        titleHtml = "<h1 id='" + cleanId(title) + "'>" + title + "</h1>";
        var elementToInclude = `${titleHtml}<div id="post_content">Could not get: <a href='${includedPageUrl}'> ${includedPageUrl}</a> . See debug messages in console for details.</div>`;
        // elementToInclude = `<html><body>${elementToInclude}</body></html>`;
        elementToInclude = await processAjaxResponseHtml(elementToInclude, jsIncludeJqueryElement, includedPageNewLevelForH1, includedPageUrl);
        console.debug(elementToInclude);
        // fixIncludedHtml(includedPageUrl, elementToInclude, includedPageNewLevelForH1);
        jsIncludeJqueryElement.html(elementToInclude);
        console.warn("An error!", error);
        return jsIncludeJqueryElement;
    });
}

// Process includes of the form:
// <div class="js_include" url="../xyz/"/>.
// can't easily use a worker - workers cannot access DOM (workaround: pass strings back and forth), cannot access jquery library.
export default function handleIncludes() {
    console.log("Entering handleIncludes.");
    if ($('.js_include').length === 0) {
        return;
    }
    return Promise.allSettled($('.js_include').map(function () {
        var jsIncludeJqueryElement = $(this);
        // The actual filling happens in a separate thread!
        return fillJsInclude(jsIncludeJqueryElement, undefined);
    }))
        .then(function (values) {
            console.log("Done including.", values);
            // The below lines do not having any effect if not called without the timeout.
            setTimeout(function () {
                main.prepareContentWithoutIncludes();
                updateToc();
            }, 5000);
            return values;
        })
        .catch(reason => console.error(reason));
}
