
export function setInlineComments(htmlIn) {
  return htmlIn.replace(/\+\+\+(.+?)\+\+\+/g, "<span class=\"inline_comment\">$1</span>");
}

function setInlineCommentsInPostContent() {
  if ($("#post_content").length > 0) {
    // console.debug( $("#post_content").html);
    // console.log(setInlineComments($("#post_content").html()));
    $("#post_content").html(setInlineComments($("#post_content").html()));
  }
}
import Sanscript from "@sanskrit-coders/sanscript";

function transliterateDevanagariBody() {
  var transliterationTarget = getQueryVariable("translitration_target");
  if (!transliterationTarget) {
    return;
  }
  var textNodes = textNodesUnder(document.getElementsByTagName("body")[0]);
  // console.debug(textNodes);
  textNodes.forEach(function (textNode) {
    textNode.textContent = Sanscript.t(textNode.textContent, "devanagari", transliterationTarget);
  })
}

export function storeLipiChoice() {
  var translitrationTargetDropdown = document.getElementsByName("transliterationDropdown")[0];
  var translitration_target = translitrationTargetDropdown.options[translitrationTargetDropdown.selectedIndex].value;
  insertQueryParam("translitration_target", translitration_target);
}

function textNodesUnder(node){
  var all = [];
  for (node=node.firstChild;node;node=node.nextSibling){
    if (node.nodeType==3) all.push(node);
    else all = all.concat(textNodesUnder(node));
  }
  return all;
}

import * as videoEmbed from "./videoEmbed";
import * as audioEmbed from "./audioEmbed";
import handleIncludes from "./handleIncludes";
import {updateToc} from "./toc";
import {insertSidebarItems, insertNavItems} from "./sidebar";

function insertQueryParam(key, value)
{
  key = encodeURI(key); value = encodeURI(value);

  var kvp = document.location.search.substr(1).split('&');

  var i=kvp.length; var x; while(i--)
{
  x = kvp[i].split('=');

  if (x[0]==key)
  {
    x[1] = value;
    kvp[i] = x.join('=');
    break;
  }
}

  if(i<0) {kvp[kvp.length] = [key,value].join('=');}

  //this will reload the page, it's likely better to store this until finished
  document.location.search = kvp.join('&');
}

export function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log('Query variable %s not found', variable);
}

// No includes processing - or adding navigation bars.
export function prepareContentWithoutIncludes() {
  setInlineCommentsInPostContent();
  transliterateDevanagariBody();
  audioEmbed.fillAudioEmbeds();
  videoEmbed.fillVideoEmbeds();
}

function onDocumentReadyTasks() {
  insertSidebarItems();
  if (topnavId) {
    insertNavItems("#div_top_bar", sidebarsData[topnavId]);
  }
  if (footernavId) {
    insertNavItems("#div_footer_bar", sidebarsData[footernavId]);
  }
  if (unicodeScript) {
    $("#post_content").attr("unicode_script", unicodeScript);
  }
  prepareContentWithoutIncludes();
  // For unknown reasons, handleIncludes() called first does not work as well 201901 desktop.
  handleIncludes();
  // Update table of contents (To be called whenever page contents are updated).
  updateToc();
  setupDisqus();
}

import {redirectToRandomPage, redirectToPage} from "./redirect";
// So that these can be used like module_main.default.redirectToPage(..).
export default {
  onDocumentReadyTasks: onDocumentReadyTasks,
  redirectToRandomPage: redirectToRandomPage,
  redirectToPage: redirectToPage
}

