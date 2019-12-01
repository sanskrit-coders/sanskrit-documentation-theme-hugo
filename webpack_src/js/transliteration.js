import Sanscript from "@sanskrit-coders/sanscript";
import * as utils from "./utils";
import * as query from "./query";

let transliterationTarget = "devanagari";
/* ---- Cookies ---- */
let LIPI_DEFAULT = "devanagari";
let LIPI_COOKIE = "translitration_target";
let LIPI_EXPIRY = 30 * 24 * 3600 * 1000;  // 30 days

function loadLipi() {
    transliterationTarget = query.getQueryVariable("translitration_target");
    if (!transliterationTarget) {
        transliterationTarget = utils.getCookie(LIPI_COOKIE) || LIPI_DEFAULT;
    }
    var translitrationTargetDropdown = document.getElementsByName("transliterationDropdown")[0];
    translitrationTargetDropdown.value = transliterationTarget;
    console.log(transliterationTarget);
}

export function saveLipi(lipi) {
    transliterationTarget = lipi || LIPI_DEFAULT;
    var date = new Date();
    date.setTime(date.getTime() + LIPI_EXPIRY);
    var addendum = "; expires=" + date.toGMTString() + "; path=/";
    document.cookie = LIPI_COOKIE + "=" + transliterationTarget + addendum;
}


export function transliterateDevanagariBody() {
    loadLipi();
    if (!transliterationTarget) {
        return;
    }
    
    var textNodes = utils.textNodesUnder(document.getElementsByTagName("body")[0]);
    // console.debug(textNodes);
    textNodes.forEach(function (textNode) {
        if(textNode.parentNode.nodeName.toLowerCase() != "option") {
            textNode.textContent = Sanscript.t(textNode.textContent, "devanagari", transliterationTarget);
        }
    })
}

