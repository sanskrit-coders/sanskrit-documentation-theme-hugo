import Sanscript from "@indic-transliteration/sanscript";
import * as utils from "./utils";
import * as query from "./query";

let transliterationTarget = "devanagari";
let transliterationTargetAlt = "??";
/* ---- Cookies ---- */
let LIPI_DEFAULT = "??";
let LIPI_COOKIE = "transliterationTarget";
let LIPI_COOKIE_ALT = "transliterationTargetAlt";
let LIPI_EXPIRY = 7 * 24 * 3600 * 1000;  // 7 days

export function loadLipi() {
  let previousTransliterationTarget = transliterationTarget;
  transliterationTarget = query.getParam("transliterationTarget");
  if (!transliterationTarget) {
    transliterationTarget = utils.getCookie(LIPI_COOKIE) || LIPI_DEFAULT;
  }
  var translitrationTargetDropdown = document.getElementById("transliterationDropdown");
  translitrationTargetDropdown.value = transliterationTarget;

  transliterationTargetAlt = query.getParam("transliterationTargetAlt");
  if (!transliterationTargetAlt) {
    transliterationTargetAlt = utils.getCookie(LIPI_COOKIE_ALT) || LIPI_DEFAULT;
  }
  var translitrationTargetDropdownAlt = document.getElementById("transliterationDropdownAlt");
  translitrationTargetDropdownAlt.value = transliterationTargetAlt;

  // console.log(transliterationTarget, transliterationTargetAlt);
}

export function saveLipi(lipi, lipiAlt) {
  transliterationTarget = lipi || LIPI_DEFAULT;
  transliterationTargetAlt = lipiAlt || LIPI_DEFAULT;
  var date = new Date();
  date.setTime(date.getTime() + LIPI_EXPIRY);
  document.cookie = `${LIPI_COOKIE}=${transliterationTarget}; ${LIPI_COOKIE_ALT}=${transliterationTargetAlt}; expires=${date.toGMTString()}; path=/`;
}

function wordPairsToText(wordPairs) {
  return wordPairs.map(function (pair) {
    if (pair[0] != pair[1])
      return `${pair[0]} {${pair[1]}}`;
    else
      return pair[0];
  }).join(" ");
}

export function transliterate(node) {
  loadLipi();
  // console.debug(transliterationTarget, transliterationTargetAlt);

  if ((!transliterationTarget || transliterationTarget == LIPI_DEFAULT) && (!transliterationTargetAlt || transliterationTargetAlt == LIPI_DEFAULT)) {
    return;
  }
  
  let transliterationSource = pageVars.unicodeScript || "devanagari";
  
  if (!(transliterationSource in Sanscript.schemes)) {
    console.error("Some unsupported scheme! Not transliterating! Check!", transliterationSource);
  }
  
  var textNodes = utils.textNodesUnder(node);
  // console.debug(transliterationSource, transliterationTarget, transliterationTargetAlt, node, textNodes);
  textNodes.forEach(function (textNode) {
    if (textNode.parentNode.nodeName.toLowerCase() != "option") {
      // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
      // console.debug(Sanscript.schemes)
      if (transliterationTarget in Sanscript.schemes) {
        if (transliterationTargetAlt == LIPI_DEFAULT) {
          textNode.textContent = Sanscript.t(textNode.textContent, transliterationSource, transliterationTarget);
        } else if (transliterationTargetAlt in Sanscript.schemes) {
          let wordPairs = Sanscript.transliterateWordwise(textNode.textContent, transliterationSource, transliterationTargetAlt).map(function (pair) {
            return [Sanscript.t(pair[0], transliterationSource, transliterationTarget), pair[1]];
          });
          textNode.textContent = wordPairsToText(wordPairs);
        } else {
          console.error("Some unsupported scheme! Not transliterating! Check!", transliterationTargetAlt);
        }
      } else if (transliterationTarget == LIPI_DEFAULT && transliterationTargetAlt in Sanscript.schemes) {
        let wordPairs = Sanscript.transliterateWordwise(textNode.textContent, transliterationSource, transliterationTargetAlt);
        textNode.textContent = wordPairsToText(wordPairs);
      }
      else {
        console.error("Some unsupported scheme! Not transliterating! Check!", transliterationTarget, transliterationTargetAlt);
      }
      // console.log("textNode", textNode, utils.getAncestors(textNode));
    }
  })
}

export function updateTransliteration() {
  var translitrationTargetDropdown = document.getElementById("transliterationDropdown");
  var translitrationTarget = translitrationTargetDropdown.options[translitrationTargetDropdown.selectedIndex].value;
  var translitrationTargetDropdownAlt = document.getElementById("transliterationDropdownAlt");
  var translitrationTargetAlt = translitrationTargetDropdown.options[translitrationTargetDropdownAlt.selectedIndex].value;
  saveLipi(translitrationTarget, translitrationTargetAlt);
  query.setParamsAndGo({"transliterationTarget": translitrationTarget, "transliterationTargetAlt": translitrationTargetAlt});
}

