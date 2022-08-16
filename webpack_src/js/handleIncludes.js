/*
Code to handle includes. handleIncludes() is the entry point.
 */

import * as comments from "./comments";
import toml from 'toml';

import urljoin from 'url-join';
import showdown from "showdown";
import {updateToc} from "./toc";
import * as query from "./query";
import * as utils from "./utils";
import * as uiLib from "./uiLib";

const yaml = require('js-yaml');
const footnotes = require('showdown-ghost-footnotes');

var showdownConverter = new showdown.Converter({
  strikethrough: true,
  simplifiedAutoLink: true,
  extensions: [footnotes]
});

let expandAllParam = query.getParam("expandAll") || "false";

function cleanId(x) {
  if (!x) {
    return "";
  }
  // console.debug(x);
  return x.replace(/[\p{P}\p{S}\s]+/gu, "_");
}

function isDetailOpen(jsInclude) {
  let details = jsInclude.getElementsByTagName("details");
  if (details.length > 0) {
    return details[0].hasAttribute("open");
  } else {
    return false;
  }
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


function getCollapseStyle(jsInclude) {
  var collapseStyle = "open";
  if (isDetailOpen(jsInclude)) {
    return collapseStyle;
  }
  // console.info("expandAllParam", expandAllParam, jsInclude);
  if (expandAllParam == "true") {
    return collapseStyle;
  }
  var isCollapsed = jsInclude.classList.contains("collapsed");
  // console.debug(isCollapsed);
  if (isCollapsed) {
    collapseStyle = "";
  }
  // console.info("collapseStyle", collapseStyle, jsInclude);
  return collapseStyle;
}

function relativizeIncludeElements(documentElement, includedPageRelativeUrl, newLevelForH1) {
  [...documentElement.body.getElementsByClassName('js_include')].forEach(function (x) {
    x.setAttribute("url", absoluteUrl(includedPageRelativeUrl,x.getAttribute("url")));
    var includedPageH1Level = parseInt(x.getAttribute("newLevelForH1"));
    if (includedPageH1Level === undefined) {
      includedPageH1Level = 6;
    }
    includedPageH1Level = Math.min(6, ((includedPageH1Level - 1) + newLevelForH1));
    x.setAttribute("newLevelForH1", includedPageH1Level);
    // console.debug("Fixed include for %s with attributes:", includedPageRelativeUrl, x.attributes);
  });
}

function relativizeHeaderElements(documentElement, includedPageRelativeUrl, newLevelForH1) {
  /*
  Fix headers in the included html so as to not mess up the table of contents
  of the including page.
  Adjusting the heading levels to retain substructure seems more complicated -
  getting the heading "under" which element falls seems non-trivial.
   */
  var headers = utils.getDescendentsByCss(documentElement.body, "h1, h2, h3, h4, h5, h6", documentElement);
  var idPrefix = cleanId(includedPageRelativeUrl);
  headers.forEach(function (headerElement) {
    var hLevel = parseInt(headerElement.tagName.substring(1));
    var hLevelNew = Math.min(6, newLevelForH1 - 1 + hLevel);
    var newId = idPrefix + "_" + cleanId(headerElement.getAttribute("id"));
    // console.debug("new header id", newId, idPrefix);
    let newTagName = `h${hLevelNew}`;
    let oldTagName = headerElement.tagName.toLowerCase();
    
    // Placing the below element after outerHTML rewrite was seen not to have any effect.
    headerElement.setAttribute("id", newId);
    // console.log("header", headerElement, oldTagName, newTagName);
    headerElement.outerHTML = headerElement.outerHTML.replace(`<${oldTagName}`, `<${newTagName}`).replace(`</${oldTagName}`, `</${newTagName}`);
  });
}

function relativizeIds(documentElement, includedPageRelativeUrl) {
  var idPrefix = cleanId(includedPageRelativeUrl);
  // console.debug("idPrefix", idPrefix);
  let idElements = utils.getDescendentsByCss(documentElement.body, "[id]", documentElement);
  idElements.forEach(function (idElement) {
    let id = idElement.getAttribute("id");
    if (id.startsWith(idPrefix)) {
      return;
    }
    if (idElement.tagName.toLowerCase().startsWith("h")) {
      // Headers should already be relativized.
      return;
    }
    let newId = `${idPrefix}_${id}`;
    // console.debug("Fixing idElement", idElement, id, newId);
    // We fix ids whether or not it is referred to by a link. We want sane html.
    idElement.setAttribute("id", newId);
    let links = utils.getDescendentsByCss(documentElement.body, `[href='#${id}']`, documentElement);

    links.forEach(function (anchor) {
      anchor.setAttribute("href", `#${newId}`);
        });
  });
}

function removeNeedlessElements(documentElement) {
  // Remove some tags.
  utils.getDescendentsByCss(documentElement.body, "script", documentElement).forEach(x => x.remove());
  utils.getDescendentsByCss(documentElement.body, "footer", documentElement).forEach(x => x.remove());
  utils.getDescendentsByCss(documentElement.body, "#disqus_thread", documentElement).forEach(x => x.remove());
  utils.getDescendentsByCss(documentElement.body, "#toc", documentElement).forEach(x => x.remove());
  utils.getDescendentsByCss(documentElement.body, "#toc_header", documentElement).forEach(x => x.remove());
  utils.getDescendentsByCss(documentElement.body, ".back-to-top", documentElement).forEach(x => x.remove());
}

/** When you include html from one page within another, you need to fix image urls, anchor urls etc..
 *
 * @param includedPageRelativeUrl
 * @param html
 * @param newLevelForH1
 * @returns {*}
 */
function relativizeHtml(includedPageRelativeUrl, html, newLevelForH1) {

  // parse html, but without loading images. Hence this.
  // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
  var virtualDocument = document.implementation.createHTMLDocument('virtual');
  virtualDocument.body.innerHTML = html;

  // console.debug(element.html());
  removeNeedlessElements(virtualDocument.body);

  if (newLevelForH1 === undefined || newLevelForH1 < 1 || newLevelForH1 > 6) {
    console.error("Ignoring invalid newLevelForH1: %d, using 6", newLevelForH1);
    newLevelForH1 = 6;
  }
  // Fix js_includes
  relativizeIncludeElements(virtualDocument, includedPageRelativeUrl, newLevelForH1);
  relativizeHeaderElements(virtualDocument, includedPageRelativeUrl, newLevelForH1);


  // Fix image, spreadsheet and other urls.
  utils.getDescendentsByCss(virtualDocument.body, "[src]", virtualDocument).forEach(function (x) {
    x.setAttribute("src", absoluteUrl(includedPageRelativeUrl, x.getAttribute("src")));
  });
  // The below also fixes footnotes.
  relativizeIds(virtualDocument, includedPageRelativeUrl);

  return virtualDocument.body.innerHTML;
}

/* This function looks at the html of the page to be included, and changes it in the following ways:
- It fixes heading levels and figures out whether a title is needed.
- It fixes urls of images, links and includes to be relative to the includedPageUrl (which is inturn relative to the current page url), so that they work as expected when included in the given page.
*/

// An async function returns results wrapped in Promise objects.
async function processAjaxResponseHtml(responseHtml, jsInclude) {
  // We want to use jquery to parse html, but without loading images. Hence this.
  // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
  let includedPageNewLevelForH1 = parseInt(jsInclude.getAttribute("newLevelForH1"));
  let includedPageRelativeUrl = getRelativeIncludedPageUrl(jsInclude);
  var virtualDocument = document.implementation.createHTMLDocument('virtual');

  // Setup title
  let addTitle = jsInclude.getAttribute("includeTitle") || jsInclude.getAttribute("title");
  // console.debug("processAjaxResponseHtml inputs", responseHtml, jsInclude, includedPageNewLevelForH1, includedPageRelativeUrl);
  let post_id = cleanId(includedPageRelativeUrl);
  virtualDocument.body.innerHTML = responseHtml;
  // console.debug("dummyElement", dummyElement, responseHtml);
  var h1Element = virtualDocument.querySelector("h1");
  var title = jsInclude.getAttribute("title");
  // console.debug("title: " + title, h1Elements[0]);
  if (!title && h1Element) {
    title = h1Element.textContent;
  }

  // Setup content
  var contentHtml;
  let content_div_id = `included_content_${post_id}`;
  var contentElement = virtualDocument.querySelector("#post_content");
  // console.log(virtualDocument, contentElement);
  let collapseStyle = getCollapseStyle(jsInclude);
  let contentInnerHtml = responseHtml;
  if (!contentElement) {
    let message = "Could not get \"post_content\" element.";
    // console.debug(message);
    contentInnerHtml = responseHtml;
  } else {
    // We don't want multiple post_content divs, hence we replace with an included-post-content div.
    contentInnerHtml = contentElement.innerHTML;
  }


  // Setup edit link
  var editLinkElement = virtualDocument.querySelector("#editLink");
  // console.debug("editLinkElements", editLinkElements);
  var editLinkHtml = "";
  if (editLinkElement) {
    editLinkHtml = `<a class="btn btn-secondary" href="${editLinkElement.getAttribute("href")}"><i class="fas fa-edit"></i></a>`
  }
  // console.debug(addTitle, title, cleanId(title), includedPageRelativeUrl);
  // Default value below is for layout sanity.
  var titleHtml = "<span></span>";
  if (addTitle && addTitle != "false") {
    if (addTitle != "plain") {
      titleHtml = `<h1 id='${cleanId(title)}'>${title}</h1>`;
    }
  }
  let popoutLink = `<a class='btn btn-secondary' href='${includedPageRelativeUrl}'><i class=\"fas fa-external-link-square-alt\"></i></a>`
  var titleRowHtml = `<span class='d-flex justify-content-between' style="white-space: pre-wrap;"> ${titleHtml}<div class="section-nav row noPrint">${popoutLink}${editLinkHtml}</div></span>`;
  if (addTitle == "plain") {
    titleRowHtml = `${title}${titleRowHtml}`;
  } else {
    titleRowHtml = `🦅🦍…🐒🐍${titleRowHtml}`;
  }

  // console.debug("contentInnerHtml", contentInnerHtml, contentElements);
  contentHtml = `<details ${collapseStyle} class='included-post-content' id="${content_div_id}"><summary>${titleRowHtml}</summary>\n\n${contentInnerHtml}</details>`;

  return relativizeHtml(includedPageRelativeUrl, contentHtml, includedPageNewLevelForH1);
}

/*
Get included page url relative to the current page url.
* */
function getRelativeIncludedPageUrl(jsInclude) {
  var includedPageUrl = jsInclude.getAttribute("url");
  if (includedPageUrl.endsWith("/")) {
    // In case one loads file://x/y/z/ rather than http://x/y/z/, the following is needed. 
    includedPageUrl = includedPageUrl + "index.html";
  }
  return includedPageUrl;
}

function getStaticFileEditUrl(includeElement) {
  var includedPageUrl = includeElement.getAttribute("url");
  if (siteParams.githubeditmepathbase.includes("github") && includedPageUrl.startsWith("/")) {
    let editUrlParts = siteParams.githubeditmepathbase.match("(.+?github.com/.+?)/(.+?)");
    let urlParts = includedPageUrl.match("/(.+?)/(.+)");
    let repoName = urlParts[1];
    let filePath = urlParts[2];
    let editUrl = `${editUrlParts[1]}/${repoName}/edit/static_files/${filePath}`;
    // console.debug("getStaticFileEditUrl", editUrl);
    return editUrl;
  }
  if (includedPageUrl.includes("githubusercontent")) {
    // From  
    // https://raw.githubusercontent.com/subhAShita/db_toml_md__sa__padya/master/main/s/y/A/d/e/syAdevatoy.md
    // get 
    // https://github.com/subhAShita/db_toml_md__sa__padya/edit/master/main/s/y/A/d/e/syAdevatoy.md
    let branch = includedPageUrl.match("https://raw.githubusercontent.com/.+?/.+?/(.+?)/")[1];
    let editUrl = includedPageUrl.replace("https://raw.githubusercontent.com/", "https://github.com/").replace(`/${branch}/`, `/edit/${branch}/`)
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
  let metadataJson = JSON.stringify(metadata, null, "  ");
  mdContent = `<pre hidden className="metadataRaw">${metadataJson}</pre>\n${mdContent}`
  let fieldNames = includeElement.getAttribute("fieldNames");
  if (fieldNames) {
    let fieldData = fieldNames.split(",").map(fieldName => {
      // console.debug(fieldName, metadata);
      let data = metadata[fieldName];
      if (data !== undefined) {
        return `${fieldName} : ${data.toString()}`;
      } else {
        return "";
      }
    });
    mdContent = fieldData.join("\n\n") + "\n\n" + mdContent;
  }
  let metadataDetailName = includeElement.getAttribute("metadataDetailName");
  if (metadataDetailName != null) {
    if (metadataDetailName == "") {
      metadataDetailName = "Metadata";
    }
    let metadataJsonMd = metadataJson;
    metadataJsonMd = metadataJsonMd.replace(/(\s*[\{\[\]\}])/g, "");
    metadataJsonMd = metadataJsonMd.replace(/(\n +)/g, "$1- ");
    // We'd rather not use pre tag here, to enable proper wrapping and readability.
    let detailsAttrs = "";
    if (isDetailOpen(jsInclude)) {
      detailsAttrs = " open";
    }
    let metadataJsonDetail = `<details><summary>${metadataDetailName}</summary>\n\n${metadataJsonMd}</details>`;
    mdContent = `${metadataJsonDetail}\n\n${mdContent}`;
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
 * @param jsInclude
 * @returns {Promise<string|*>}
 */
async function fillJsInclude(jsInclude) {
  if (!jsInclude.hasAttribute("unfilled")) {
    // console.trace();
    console.debug("Refusing to refill element", jsInclude);
    return "Already loaded";
  }
  jsInclude.removeAttribute("unfilled");
  
  jsInclude.firstChild.removeEventListener("toggle", detailsJsIncludeLoader);
  let includedPageUrl = getRelativeIncludedPageUrl(jsInclude);
  if (includedPageUrl == "") {
    console.error("Invalid url!", jsInclude);
    return "Invalid url!"
  }
  console.info("Inserting include for %s given tag:", includedPageUrl, jsInclude);
  let getAjaxResponsePromise = $.ajax(includedPageUrl);

  function processingFn(response) {
    let responseHtml = response;
    if (includedPageUrl.endsWith(".md")) {
      responseHtml = markdownToHtml(response, jsInclude);
    }
    // console.debug("responseHtml", responseHtml);
    return processAjaxResponseHtml(responseHtml, jsInclude);
  }

  return getAjaxResponsePromise.then(processingFn).then(function (contentElement) {
    // console.log(contentElement);
    jsInclude.innerHTML = contentElement;
    uiLib.prepareContentWithoutIncludes(jsInclude);
    // Second level includes will be handled by another handleIncludes() call. So, we don't worry about them here.
    let secondLevelIncludes = [...jsInclude.getElementsByClassName('js_include')];
    secondLevelIncludes.forEach(addPlaceholderDetail);
    const event = new CustomEvent('jsFill', { detail: "Success"});
    jsInclude.dispatchEvent(event);
    return jsInclude;
  }).catch(async function (error) {
    var titleHtml = "";
    var title = "Missing page.";
    titleHtml = "<h1 id='" + cleanId(title) + "'>" + title + "</h1>";
    var elementToInclude = `${titleHtml}<div id="post_content">Could not get: <a href='${includedPageUrl}'> ${includedPageUrl}</a> . See debug messages in console for details.</div>`;
    // elementToInclude = `<html><body>${elementToInclude}</body></html>`;
    elementToInclude = await processAjaxResponseHtml(elementToInclude, jsInclude);
    // console.debug(elementToInclude);
    // relativizeHtml(includedPageUrl, elementToInclude, includedPageNewLevelForH1);
    jsInclude.innerHTML = elementToInclude;

    console.warn("An error!", error);
    const event = new CustomEvent('jsFill', { detail: "Failure"});
    jsInclude.dispatchEvent(event);
    return jsInclude;
  });
}

function detailsJsIncludeLoader(event) {
  if (event.type == "toggle") {
    fillJsInclude(event.target.parentNode)
  }
}

async function addPlaceholderDetail(jsInclude) {
  if (jsInclude.children.length > 0) {return 0;}
  let title = jsInclude.getAttribute("title") || "...{Loading}...";
  let contentHtml = `<details class='included-post-content'><summary>🦅🦍…🐒🐍<h1>${title}</h1></summary>\n\n"...{Loading}..."</details>`;
  jsInclude.innerHTML = await processAjaxResponseHtml(contentHtml, jsInclude);
  jsInclude.setAttribute("unfilled", "")
  if(getCollapseStyle(jsInclude) == "") {
    jsInclude.firstChild.addEventListener("toggle", detailsJsIncludeLoader);
  }
  return 1;
}

// Process includes of the form:
// <div class="js_include" url="../xyz/"/>.
// can't easily use a worker - workers cannot access DOM (workaround: pass strings back and forth), cannot access jquery library.
export default function handleIncludes() {
  console.log("Entering handleIncludes.");
  let jsIncludes = Array.from(document.getElementsByClassName("js_include"));
  // Can't make the below global  - document needs to load first.
  let progressBar = document.getElementById("progressLoading");
  if (jsIncludes.length === 0) {
    // WARNING: Chrome 2022  - the below somehow does not work visually though the html is altered to say "hidden".
    document.getElementById("progressBarDiv").hidden = true;
    return;
  }
  let filledIncludes = 0;
  progressBar.setAttribute("max", jsIncludes.length.toString());
  progressBar.setAttribute("value", filledIncludes.toString());
  jsIncludes.forEach(addPlaceholderDetail);
  let openIncludes = jsIncludes.filter(x => getCollapseStyle(x) == "open");
  let collapsedIncludes = jsIncludes.filter(x => getCollapseStyle(x) == "");
  
  function postIncludeTasks() {
    console.log("Done including %d out of %d.", filledIncludes, jsIncludes.length);
    if (filledIncludes == jsIncludes.length) {
      document.getElementById("progressBarDiv").hidden = true;
      // Some included pages may have resulted in new jsInclude elements!
      let newJsIncludes = Array.from(document.getElementsByClassName("js_include")).filter(x => x.hasAttribute("unfilled"));
      if (newJsIncludes.length) {
        console.log("Got jsIncludes within the included pages!");
        handleIncludes();
      } else {
        uiLib.finalizePagePostInclusion();
      }
    }
  }

  function loadFirstInclude(jsIncludeList, intervalId) {
    let jsInclude = jsIncludeList.shift();
    if (jsInclude) {
      fillJsInclude(jsInclude).catch(reason => console.error(reason));
      filledIncludes = filledIncludes + 1;
      progressBar.setAttribute("value", filledIncludes.toString());
    } else {
      clearInterval(intervalId);
      postIncludeTasks();
    }
    
  }
  var openIncludesLoadingIntervalId = window.setInterval(function () {
    loadFirstInclude(openIncludes, openIncludesLoadingIntervalId)
  }, 1000);
  
  var closedIncludesLoadingIntervalId = window.setInterval(function () {
    loadFirstInclude(collapsedIncludes, closedIncludesLoadingIntervalId)
  }, 1000);
  return jsIncludes.length;
}
