import * as textToSpeech from "./textToSpeech";
import * as videoEmbed from "./videoEmbed";
import * as audioEmbed from "./audioEmbed";
import handleIncludes from "./handleIncludes";
import {updateToc} from "./toc";
import * as sidebar from "./sidebar";
import * as search from "./search";
import * as transliteration from "./transliteration";
import * as comments from "./comments";
import * as spreadsheets from "./spreadsheets";
import {redirectToPage, redirectToRandomPage} from "./redirect";
import * as dirTree from "./dirTree";
import * as uiLib from "./uiLib";
import * as query from "./query";
import {setInlineComments} from "./comments";

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
}

export function finalizePagePostInclusion() {
  uiLib.expandAllDetails(document.body);
  uiLib.setPrintLayoutFromQuery(document.body);
  updateToc();
}

async function onDocumentReadyTasks() {
  await dirTree.populateTree();
  pageVars.pageParams = dirTree.getPageParams(pageVars.pageUrlMinusBasePath);
  pageVars.sidebarId = pageVars.pageParams.sidebar || pageDefaults.sidebar;
  pageVars.topnavId = pageVars.pageParams.topnav || pageDefaults.topnav;
  pageVars.footernavId = pageVars.pageParams.footernav || pageDefaults.footernav;
  pageVars.unicodeScript = pageVars.pageParams.unicode_script || pageDefaults.unicode_script;
  sidebar.insertSidebarItems();
  sidebar.setupSidebarToggle();
  search.setupTitleSearch();
  let nextPage = dirTree.getNextPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("nextPage"), nextPage, ">" );
  let previousPage = dirTree.getPreviousPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("previousPage"), previousPage, "<" );

  if (pageVars.topnavId && sidebarsData[pageVars.topnavId]) {
    sidebar.insertNavItems("#top-bar-right-custom", sidebarsData[pageVars.topnavId]);
  }
  if (pageVars.footernavId && sidebarsData[pageVars.footernavId]) {
    sidebar.insertNavItems("#footer-bar-right-custom", sidebarsData[pageVars.footernavId]);
  }
  if (pageVars.unicodeScript) {
    document.querySelector("#post_content").setAttribute("unicode_script", pageVars.unicodeScript);
  }
  prepareContentWithoutIncludes();
  if (!handleIncludes()) {
    // handleIncludes spawns threads which independently call the below.
    finalizePagePostInclusion();
  }
  setupDisqus();
}

// So that these can be used like module_main.default.redirectToPage(..).
export default {
  onDocumentReadyTasks: onDocumentReadyTasks,
  redirectToRandomPage: redirectToRandomPage,
  redirectToPage: redirectToPage,
  addRelUrlToTree: dirTree.addRelUrlToTree,
  sidebarToggleHandler: sidebar.sidebarToggleHandler,
  updateCommentStyleFromDropdown: comments.updateCommentStyleFromDropdown,
  handleSpeakToggle: textToSpeech.handleSpeakToggle,
  query: {
    removeParamAndGo: query.deleteParamAndGo,
    setParamAndGo: query.setParamAndGo,
    getParam: query.getParam,
  }
}

