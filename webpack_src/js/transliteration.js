import Sanscript from "@sanskrit-coders/sanscript";
import * as utils from "./utils";
import * as query from "./query";

let transliterationTarget = "devanagari";
/* ---- Cookies ---- */
let LIPI_DEFAULT = "devanagari";
let LIPI_COOKIE = "transliteration_target";
let LIPI_EXPIRY = 30 * 24 * 3600 * 1000;  // 30 days

export function loadLipi() {
  let previousTransliterationTarget = transliterationTarget;
  transliterationTarget = query.getParam("transliteration_target");
  if (!transliterationTarget) {
    transliterationTarget = utils.getCookie(LIPI_COOKIE) || LIPI_DEFAULT;
  }
  var translitrationTargetDropdown = document.getElementById("transliterationDropdown");
  translitrationTargetDropdown.value = transliterationTarget;
  // console.log(transliterationTarget);
}

export function saveLipi(lipi) {
  transliterationTarget = lipi || LIPI_DEFAULT;
  var date = new Date();
  date.setTime(date.getTime() + LIPI_EXPIRY);
  var addendum = "; expires=" + date.toGMTString() + "; path=/";
  document.cookie = LIPI_COOKIE + "=" + transliterationTarget + addendum;
}


export function transliterate(node) {
  loadLipi();
  if (!transliterationTarget) {
    return;
  }
  let transliterationSource = pageVars.unicodeScript || "devanagari";
  var textNodes = utils.textNodesUnder(node);
  // console.debug(transliterationSource, transliterationTarget, node, textNodes);
  textNodes.forEach(function (textNode) {
    if (textNode.parentNode.nodeName.toLowerCase() != "option") {
      // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
      // console.debug(Sanscript.schemes)
      if (transliterationSource in Sanscript.schemes && transliterationTarget in Sanscript.schemes) {
        textNode.textContent = Sanscript.t(textNode.textContent, transliterationSource, transliterationTarget);
      } else {
        console.error("Some unsupported scheme! Not transliterating! Check!", transliterationSource, transliterationTarget)
      }
      // console.log("textNode", textNode, utils.getAncestors(textNode));
    }
  })
}

export function updateTransliteration() {
  var translitrationTargetDropdown = document.getElementById("transliterationDropdown");
  var translitrationTarget = translitrationTargetDropdown.options[translitrationTargetDropdown.selectedIndex].value;
  saveLipi(translitrationTarget);
  query.setParamAndGo("transliteration_target", translitrationTarget);
}

