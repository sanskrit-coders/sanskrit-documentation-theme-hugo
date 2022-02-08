/*
Code to handle includes. handleIncludes() is the entry point.
 */

import * as main from "./main";
import * as comments from "./comments";
import toml from 'toml';

import urljoin from 'url-join';
import showdown from "showdown";
import {updateToc} from "./toc";

const yaml = require('js-yaml');
const footnotes = require('showdown-ghost-footnotes');

var showdownConverter = new showdown.Converter({strikethrough: true, simplifiedAutoLink: true, extensions: [footnotes]});

function cleanId(x) {
    if (x === undefined) {
        return "";
    }
    // console.debug(x);
    return x.replace(/[\p{P}\p{S}\s]+/gu, "_");
}

/*
Example: absoluteUrl("../subfolder1/divaspari/", "../images/forest-fire.jpg") == "../subfolder1/images/forest-fire.jpg"
WARNING NOTE: won't work with say base = "http://google.com" since it does not end with /. 
 */
function absoluteUrl(baseUrl, relative) {
    let baseUrlStr = baseUrl.toString();
    // console.debug(baseUrl, relative);
    // console.trace();
    if (relative.startsWith("http") || relative.startsWith("file") || relative.startsWith("/")) {
        return relative;
    }

    let baseWithoutIntraPageLink = baseUrlStr.split("#")[0];
    var baseDirStack = baseWithoutIntraPageLink.toString().split("/");
    // console.debug(baseDirStack, urljoin(baseDirStack.join("/"), relative.toString()));
    baseDirStack.pop(); // remove current file name (or empty string)
    // console.debug(baseDirStack, urljoin(baseDirStack.join("/"), relative.toString()));
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

function relativizeIncludeElements(jqueryElement, includedPageRelativeUrl, newLevelForH1) {
    jqueryElement.find('.js_include').each(function () {
        $(this).attr("url", absoluteUrl(includedPageRelativeUrl, $(this).attr("url")));
        var includedPageH1Level = parseInt($(this).attr("newLevelForH1"));
        if (includedPageH1Level === undefined) {
            includedPageH1Level = 6;
        }
        includedPageH1Level = Math.min(6, ((includedPageH1Level - 1) + newLevelForH1));
        $(this).attr("newLevelForH1", includedPageH1Level);
        // console.debug("Fixed include for %s with attributes:", includedPageRelativeUrl, $(this)[0].attributes);
    });
}

function relativizeHeaderElements(jqueryElement, includedPageRelativeUrl, newLevelForH1) {
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
            $.each(this.attributes, function () {
                if (this.name == 'id') return; // Avoid someone (optional)
                if (this.specified) newHeaderEl.attr(this.name, this.value);
            });
            // console.debug(headerElement, newHeaderEl);
            return newHeaderEl;
        });
    }
}

function relativizeLinks(jqueryElement, includedPageRelativeUrl) {
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
}

function removeNeedlessElements(jqueryElement) {
    // Remove some tags.
    jqueryElement.find("script").remove();
    jqueryElement.find("footer").remove();
    jqueryElement.find("#disqus_thread").remove();
    jqueryElement.find("#toc").remove();
    jqueryElement.find("#toc_header").remove();
    jqueryElement.find(".back-to-top").remove();
}

/** When you include html from one page within another, you need to fix image urls, anchor urls etc..
 * 
 * @param includedPageRelativeUrl
 * @param html
 * @param newLevelForH1
 * @returns {*}
 */
function relativizeHtml(includedPageRelativeUrl, html, newLevelForH1) {
    let post_id = cleanId(includedPageRelativeUrl);
    html = fixFootnotes(html, post_id)

    // We want to use jquery to parse html, but without loading images. Hence this.
    // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
    var virtualDocument = document.implementation.createHTMLDocument('virtual');
    // The surrounding divs are eliminated when the jqueryElement is created.
    var jqueryElement = $(comments.setInlineComments(`<div>${html}</div>`), virtualDocument);

    // console.debug(jqueryElement.html());
    removeNeedlessElements(jqueryElement);

    if (newLevelForH1 === undefined || newLevelForH1 < 1 || newLevelForH1 > 6) {
        console.error("Ignoring invalid newLevelForH1: %d, using 6", newLevelForH1);
        newLevelForH1 = 6;
    }
    // Fix js_includes
    relativizeIncludeElements(jqueryElement, includedPageRelativeUrl, newLevelForH1);
    relativizeHeaderElements(jqueryElement, includedPageRelativeUrl, newLevelForH1);


    // Fix image urls.
    jqueryElement.find("img").each(function () {
        // console.log(includedPageRelativeUrl, $(this).attr("src"), absoluteUrl(includedPageRelativeUrl, $(this).attr("src")));
        // console.log($(this).attr("src"))
        $(this).attr("src", absoluteUrl(includedPageRelativeUrl, $(this).attr("src")));
        // console.log($(this).attr("src"))
    });
    relativizeLinks(jqueryElement, includedPageRelativeUrl);

    return jqueryElement.html();
}

/* This function looks at the html of the page to be included, and changes it in the following ways:
- It fixes heading levels and figures out whether a title is needed.
- It fixes urls of images, links and includes to be relative to the includedPageUrl (which is inturn relative to the current page url), so that they work as expected when included in the given page.
*/

function fixFootnotes(responseHtml, post_id) {
    responseHtml = responseHtml.replace(/("#?fnref-\d+)/, "$1-" + post_id);
    responseHtml = responseHtml.replace(/("#?fn-\d+)/, "$1-" + post_id);
    return responseHtml;
}

// An async function returns results wrapped in Promise objects.
async function processAjaxResponseHtml(responseHtml, jsIncludeJqueryElement) {
    // We want to use jquery to parse html, but without loading images. Hence this.
    // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
    let includedPageNewLevelForH1 = parseInt(jsIncludeJqueryElement.attr("newLevelForH1"));
    let includedPageRelativeUrl = getRelativeIncludedPageUrl(jsIncludeJqueryElement);
    var virtualDocument = document.implementation.createHTMLDocument('virtual');

    // Setup title
    let addTitle = jsIncludeJqueryElement.attr("includeTitle") || jsIncludeJqueryElement.attr("title");
    // console.debug("processAjaxResponseHtml inputs", responseHtml, jsIncludeJqueryElement, includedPageNewLevelForH1, includedPageRelativeUrl);
    let post_id = cleanId(includedPageRelativeUrl);
    let virtualDocJq = $(`<div>${responseHtml}</div>`, virtualDocument);
    // console.debug("virtualDocJq", virtualDocJq, responseHtml);
    var titleElements = virtualDocJq.find("h1");
    var title = jsIncludeJqueryElement.attr("title");
    // console.debug("title: " + title, titleElements[0]);
    if (!title && titleElements.length > 0) {
        title = titleElements[0].textContent;
    }

    // Setup content
    var contentHtml;
    let content_div_id = `included_content_${post_id}`;
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
    // console.debug("contentInnerHtml", contentInnerHtml, contentElements);
    contentHtml = `<div class='included-post-content ${collapseStyle}' id="${content_div_id}">${contentInnerHtml}</div>`;


    // Setup edit link
    var editLinkElements = $(responseHtml, virtualDocument).find("#editLink");
    // console.debug("editLinkElements", editLinkElements);
    var editLinkHtml = "";
    if (editLinkElements.length > 0) {
        editLinkHtml = `<a class="btn btn-secondary" href="${editLinkElements.attr("href")}"><i class="fas fa-edit"></i></a>`
    }
    // console.debug(addTitle, title, cleanId(title), includedPageRelativeUrl);
    var titleHtml = "<div></div>";
    if (addTitle && addTitle != "false") {
        titleHtml = relativizeHtml(includedPageRelativeUrl, `<h1 id='${cleanId(title)}'  data-toggle="collapse" href="#${content_div_id}" aria-expanded="true" aria-controls="${content_div_id}">${title}</h1>`, includedPageNewLevelForH1);
    }
    var collapseLink = `<a id="collapser_${post_id}" class="btn" data-toggle="collapse" href="#${content_div_id}" aria-expanded="true" aria-controls="${content_div_id}"><i class="fas fa-caret-down"></i></a>`;
    let popoutLink = `<a class='btn btn-secondary' href='${includedPageRelativeUrl}'><i class=\"fas fa-external-link-square-alt\"></i></a>`
    var titleRowHtml = `<div class='border d-flex justify-content-between' id="included_title_${post_id}">${titleHtml}<div class="section-nav row noPrint">${collapseLink}${popoutLink}${editLinkHtml}</div></div>`;
    var elementToInclude = $(`<div class='included-post border' id=\"included_post_${post_id}\"></div>`);
    elementToInclude.html(titleRowHtml + relativizeHtml(includedPageRelativeUrl, contentHtml, includedPageNewLevelForH1));
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

function getStaticFileEditUrl(includeElement) {
    var includedPageUrl = includeElement.attr("url");
    if (siteParams.githubeditmepathbase.includes("github") && includedPageUrl.startsWith("/")) {
        let editUrlParts = siteParams.githubeditmepathbase.match("(.+?github.com/.+?)/(.+?)");
        let urlParts = includedPageUrl.match("/(.+?)/(.+)");
        let repoName = urlParts[1];
        let filePath = urlParts[2];
        let editUrl = `${editUrlParts[1]}/${repoName}/edit/static_files/${filePath}`;
        // console.debug("getStaticFileEditUrl", editUrl);
        return editUrl;
    }
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
            metadata = yaml.load(metadataText);
        } else {
            metadata = toml.parse(metadataText);
            // console.debug(metadata);
        }
    } catch (err) {
        let message = `Metadata parse error. Check [file](${includedPageUrl}).`;
        console.error(message);
        mdContent = `${message}\n\n${mdContent}`;
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
    let editUrl = getStaticFileEditUrl(includeElement);
    let editLinkHtml = "";
    if (editUrl) {
        editLinkHtml = `<a id="editLink" href="${editUrl}"></a>`;
    }
    let responseHtml = `<header><h1>${metadata["title"]}</h1>${editLinkHtml}</header><div id="post_content">${showdownConverter.makeHtml(mdContent)}</div>`;
    // console.debug(responseHtml);
    return responseHtml;
}

/**
 * 
 * @param jsIncludeJqueryElement
 * @returns {Promise<string|*>}
 */
async function fillJsInclude(jsIncludeJqueryElement) {
    if (jsIncludeJqueryElement.html().trim() !== "") {
        console.warn("Refusing to refill element with non-empty html - ", jsIncludeJqueryElement);
        return "Already loaded";
    }

    let includedPageUrl = getRelativeIncludedPageUrl(jsIncludeJqueryElement);
    if (includedPageUrl == "") {
        console.error("Invalid url!", jsIncludeJqueryElement);
        return "Invalid url!"
    }
    console.info("Inserting include for %s with attributes:", includedPageUrl, jsIncludeJqueryElement[0].attributes);
    let getAjaxResponsePromise = $.ajax(includedPageUrl);

    function processingFn(response) {
        let responseHtml = response;
        if (includedPageUrl.endsWith(".md")) {
            responseHtml = markdownToHtml(response, jsIncludeJqueryElement);
        }
        // console.debug("responseHtml", responseHtml);
        return processAjaxResponseHtml(responseHtml, jsIncludeJqueryElement);
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
        elementToInclude = await processAjaxResponseHtml(elementToInclude, jsIncludeJqueryElement);
        // console.debug(elementToInclude);
        // relativizeHtml(includedPageUrl, elementToInclude, includedPageNewLevelForH1);
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
        return fillJsInclude(jsIncludeJqueryElement);
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
