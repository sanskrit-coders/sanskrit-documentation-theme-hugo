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

export function relUrlOfCurrentPage() {
  return document.location.href.split("#")[0].replace(baseURL, "/");
}

// No includes processing - or adding navigation bars.
export function prepareContentWithoutIncludes() {
  comments.setInlineCommentsInPostContent();
  transliteration.transliterate();
  audioEmbed.fillAudioEmbeds();
  videoEmbed.fillVideoEmbeds();
  spreadsheets.fillSheets();
}


async function onDocumentReadyTasks() {
  await dirTree.populateTree();
  pageVars.pageParams = module_dir_tree.getPageParams(pageVars.pageUrlMinusBasePath);
  pageVars.sidebarId = pageVars.pageParams.sidebar || pageDefaults.sidebar;
  pageVars.topnavId = pageVars.pageParams.topnav || pageDefaults.topnav;
  pageVars.footernavId = pageVars.pageParams.footernav || pageDefaults.footernav;
  pageVars.unicodeScript = pageVars.pageParams.unicode_script || pageDefaults.unicode_script;
  sidebar.insertSidebarItems();
  sidebar.setupSidebarToggle();
  search.setupTitleSearch();
  let nextPage = module_dir_tree.getNextPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementsByName("nextPage")[0], nextPage, ">" );
  let previousPage = module_dir_tree.getPreviousPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementsByName("previousPage")[0], previousPage, "<" );

  if (pageVars.topnavId && sidebarsData[pageVars.topnavId]) {
    sidebar.insertNavItems("#top-bar-right-custom", sidebarsData[pageVars.topnavId].contents);
  }
  if (pageVars.footernavId && sidebarsData[pageVars.footernavId]) {
    sidebar.insertNavItems("#footer-bar-right-custom", sidebarsData[pageVars.footernavId].contents);
  }
  if (pageVars.unicodeScript) {
    $("#post_content").attr("unicode_script", pageVars.unicodeScript);
  }
  prepareContentWithoutIncludes();
  // For unknown reasons, handleIncludes() called first does not work as well 201901 desktop.
  handleIncludes();
  // Update table of contents (To be called whenever page contents are updated).
  updateToc();
  setupDisqus();
  textToSpeech.setup();
}

// So that these can be used like module_main.default.redirectToPage(..).
export default {
  onDocumentReadyTasks: onDocumentReadyTasks,
  redirectToRandomPage: redirectToRandomPage,
  redirectToPage: redirectToPage,
  addRelUrlToTree: dirTree.addRelUrlToTree,
  sidebarToggleHandler: sidebar.sidebarToggleHandler,
  updateCommentStyleFromDropdown: comments.updateCommentStyleFromDropdown,
  handleSpeakToggle: textToSpeech.handleSpeakToggle
}

