import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tachyons/css/tachyons.min.css';

// The below don't yield equally good results[??], so omitting and including separately.
// import '@fortawesome/fontawesome-free/js/fontawesome';
// import '@fortawesome/fontawesome-free/js/solid';

import "../css/treeview.css";
import "../css/class_styles.css";

import * as copyButtons from "./copyButtons";
import * as query from "./query";
import * as transliteration from "./transliteration";
import {setInlineComments} from "./comments";
import * as audioEmbed from "./audioEmbed";
import * as videoEmbed from "./videoEmbed";
import * as spreadsheets from "./spreadsheets";
import {updateToc} from "./toc";
import * as dirTree from "./dirTree";
import * as sidebar from "./sidebar";
import * as indexes from "./indexes";
import * as search from "./search";
import handleIncludes from "./handleIncludes";
import {redirectToPage, redirectToRandomPage} from "./redirect";
import * as comments from "./comments";
import * as textToSpeech from "./textToSpeech";
import * as utils from "./utils";
import {loadDataListFromTSV, loadDropdownFromTSV} from "./indexes";

export function relUrlOfCurrentPage() {
  return document.location.href.split("#")[0].replace(baseURL, "/");
}

// No includes processing - or adding navigation bars.
export function prepareContentWithoutIncludes(node) {
  if (!node) {
    node = document.body;
    transliteration.loadLipi();
  }
  // setting node.outerHTML will cause later calls to fail!
  node.innerHTML = setInlineComments(node.innerHTML);
  transliteration.transliterate(node);
  audioEmbed.fillAudioEmbeds(node);
  videoEmbed.fillVideoEmbeds(node);
  spreadsheets.fillSheets(node);

  // Doing the below before inclusion also -  
  // so that unnecessary include processing can be avoided.
  expandDetails(document.querySelector("body main"));
  setPrintColsFromQuery(document.body);
}

export function finalizePagePostInclusion() {
  expandDetails(document.querySelector("body main"));
  setPrintColsFromQuery(document.body);
  updateToc();
  collapsibleSections();
  document.querySelectorAll(".copyable")
      .forEach(copyableDiv => copyButtons.createCopyButton(copyableDiv));
  const sdThemeDoneEvent = new CustomEvent('sdThemeDone', { detail: { someData: 'example' } });
  console.log("Dispatching sdThemeDoneEvent", sdThemeDoneEvent);
  document.dispatchEvent(sdThemeDoneEvent);
}

export async function preLoadTasks() {
  console.log("preLoadTasks");
  await dirTree.populateTree();
  pageVars.pageParams = dirTree.getPageParams(pageVars.pageUrlMinusBasePath);
  pageVars.sidebarId = pageVars.pageParams.sidebar || pageDefaults.sidebar;
  pageVars.topnavId = pageVars.pageParams.topnav || pageDefaults.topnav;
  pageVars.footernavId = pageVars.pageParams.footernav || pageDefaults.footernav;
  pageVars.unicodeScript = pageVars.pageParams.unicode_script || pageDefaults.unicode_script;
}

export async function onDocumentReadyTasks() {
  await preLoadTasks();
  sidebar.insertSidebarItems();
  sidebar.setupSidebarToggle();
  search.setupTitleSearch();
  let nextPage = dirTree.getNextPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("nextPage"), nextPage, ">");
  dirTree.setAnchor(document.getElementById("nextPageFoot"), nextPage, ">");
  let previousPage = dirTree.getPreviousPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("previousPage"), previousPage, "<");
  dirTree.setAnchor(document.getElementById("previousPageFoot"), previousPage, "<");

  if (pageVars.topnavId && sidebarsData[pageVars.topnavId]) {
    sidebar.insertNavItems("top-bar-right-custom", sidebarsData[pageVars.topnavId]);
  }
  if (pageVars.footernavId && sidebarsData[pageVars.footernavId]) {
    sidebar.insertNavItems("footer-bar-right-custom", sidebarsData[pageVars.footernavId]);
  }
  if (pageVars.unicodeScript) {
    document.querySelector("#post_content").setAttribute("unicode_script", pageVars.unicodeScript);
  }
  prepareContentWithoutIncludes();
  if (!handleIncludes()) {
    // handleIncludes spawns threads which independently call the below.
    finalizePagePostInclusion();
  }
}

export function replaceWithQueryParam(queryFieldName, regexPattern) {
  let value = query.getParam(queryFieldName);
  if (value) {
    document.body.innerHTML = document.body.innerHTML.replace(regexPattern, value);
    // WARNING: Because of the above replacement(?), the below does not work as of 202202. Employ some other idea.
    let inputField = document.getElementById(`input_${queryFieldName}`);
    console.log("replaceWithQueryParam", queryFieldName, value, inputField, Boolean(inputField), document.getElementById(`input_${queryFieldName}`).value);
    if (inputField) {
      inputField.value = value;
      // document.getElementById(`input_${queryFieldName}`).value = value;
    }
  }
}

export function collapsibleSections() {
  let printCols = query.getParam("printCols") || "notPrintView";
  if (printCols != "notPrintView") {
    return;
  }
  for(let level = 2; level < 7; level++) {
    const levelHs = Array.from(document.querySelectorAll(`h${level}`));

    for (let i = 0; i < levelHs.length - 1; i++) {
      const currentH = levelHs[i];
      if (currentH.hasAttribute("hasDetail")) {
        continue;
      }

      // Create <details> and <summary>
      const details = document.createElement('details');
      details.setAttribute("open", "true");
      details.classList.add("headingDetail");
      const summary = document.createElement('summary');
      // summary.textContent = currentH.textContent;
      summary.textContent = "🦅🦍…🐒🐍";
      details.appendChild(summary);
      
      // The below leads to non-functional details.
      // summary.appendChild(currentH);


      // Collect all nodes between startH2 and endH2
      let currentNode = currentH.nextSibling;
      function isHigherHeading(node) {
        return node && node.nodeName.toLowerCase().startsWith("h") &&  parseInt(node.nodeName.charAt(1)) <= level;
      }
      while (currentNode && !isHigherHeading(currentNode)) {
        let nextNode = currentNode.nextSibling;
        // Append _after_ finding nextSibling!
        details.appendChild(currentNode);
        currentNode = nextNode;
      }
      
      let parent = currentH.parentNode;
      const nextElem = currentH.nextElementSibling;
      if (nextElem) {
        parent.insertBefore(details, nextElem);
      } else {
        parent.appendChild(details);
      }
      currentH.setAttribute("hasDetail", "true");
      
    }
  }
}

export function updatePrintStyle() {
  console.log("updatePrintStyle entered");
  let bodyFontSize = document.getElementById("tbBodyFontSize").value;
  let printCols = document.getElementById("tbColumns").value;
  let includeStyle = document.getElementById("tbIncludeStyle").value;
  query.setParamsAndGo({"printCols": printCols, "bodyFontSize": bodyFontSize, "includeStyle": includeStyle});
}

export function setPrintColsFromQuery(node) {
  console.log("Entering setprintColsFromQuery", node);
  let printCols = query.getParam("printCols") || "notPrintView";
  if (printCols == "notPrintView") {
    return;
  }
  let includeStyle = query.getParam("includeStyle") || "true";
  const mainTag = document.querySelector('main');

  let infoTag = document.querySelector("#infoTag");
  if (!infoTag) {
    infoTag = document.createElement("small");
    infoTag.setAttribute("id", "infoTag");
    infoTag.innerHTML = `<a href='${document.location}'>Web</a>`
    if (includeStyle != "true") {
      infoTag.innerHTML += "\n(noInc)"
    }
    let titleTag = document.querySelector("h1");
    if(titleTag) {
      titleTag.parentNode.insertBefore(infoTag, titleTag);
    }
  }

  console.log("setprintColsFromQuery", printCols, includeStyle);
  mainTag.style.columnCount = printCols;

  let bodyFontSize = query.getParam("bodyFontSize");
  if (bodyFontSize) {
    document.body.style.fontSize = bodyFontSize;
  }
  
  [...node.querySelectorAll(".noPrint")].forEach(function (e) {
    e.setAttribute("hidden", "true");
  });
  [...node.querySelectorAll("#disqus_thread")].forEach(function (e) {
    e.setAttribute("hidden", "true");
  });
  let expandDetailsParam = query.getParam("expandDetails") || "false";
  [...node.getElementsByTagName("summary")].forEach(function (e) {
    if (!e.parentNode.hasAttribute("open")) {
      e.parentNode.hidden = true;
    } else {
      if(e.parentNode.classList.contains("headingDetail")) {
        // Just hide the summary tag.
        e.hidden = true;
      }
      if (expandDetailsParam == "false") {
        if(e.textContent.includes("विश्वास-प्रस्तुतिः")) {
          // Just hide the summary tag.
          e.hidden = true;
        }
        if (includeStyle != "1" && e.firstChild) {
          e.firstChild.textContent = e.firstChild.textContent.replace("...{Loading}...", "").trim();
        }
      }


      // Hide select headers?
      // var headers = e.querySelectorAll("h1, h2, h3");
      // // console.debug(e, headers);
      // if(headers.length == 0)  {
      //   e.hidden = true;
      // }
    }
  });
  [...node.getElementsByClassName("fa-external-link-square-alt")].forEach(function (e) {
    e.parentNode.hidden = true;
  });
}

export function expandDetails(node) {
  let detailsPattern = query.getParam("expandDetails") || "false";
  if (detailsPattern == "false") {
    return;
  }
  [...node.getElementsByTagName("details")].forEach(function (e) {
    if (e.hasAttribute("open")) {
      e.setAttribute("preOpened", "true");
    } else {
      let titleMatch = e.querySelector("summary").textContent.match(detailsPattern);
      // console.debug(titleMatch, e.querySelector("summary").textContent, expandDetails);
      if (titleMatch) {
        e.setAttribute("open", "true");
      }
    }
  });
  if (node.tagName.toLocaleLowerCase() == "body") {
    document.querySelector("#expandAllButton").onclick = function () {
      query.deleteParamsAndGo(["expandDetails"]);
    };
  }
}

export function getFontSize(element) {
  let size = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
  return size
}


export function changeTextSize(diff) {
  const mainTag = document.querySelector('main');

  let size = getFontSize(mainTag);
  console.debug(size);
  size = size + diff;
  // if (size <= 10) {
  //   size = 10;
  // }
  mainTag.style.fontSize = size + "px";
}

// Functions exported in this very file can be accessed like - module_uiLib.changeTextSize.  
// But for others, we use the below, so that they may be accessed as module_uiLib.default.redirectToPage(..).
export default {
  navigation: {
    sidebarToggleHandler: sidebar.sidebarToggleHandler,
    pageLoader: search.pageLoader,
    redirectToPage: redirectToPage,
    redirectToRandomPage: redirectToRandomPage,
    loadDataListFromTSV: indexes.loadDataListFromTSV,
    loadDropdownFromTSV: indexes.loadDropdownFromTSV
  },
  content: {
    updateTransliteration: transliteration.updateTransliteration,
    handleSpeakToggle: textToSpeech.handleSpeakToggle,
    updateCommentStyleFromDropdown: comments.updateCommentStyleFromDropdown,
    updatePrintStyle: updatePrintStyle,
    getPageParams: dirTree.getPageParams,
    changeTextSize: changeTextSize,
    handleIncludes: handleIncludes
  },
  query: {
    deleteParamsAndGo: query.deleteParamsAndGo,
    setParamsAndGo: query.setParamsAndGo,
    getParam: query.getParam,
  }
}
