import Sanscript from "@sanskrit-coders/sanscript";
import * as utils from "./utils";
import * as query from "./query";

let transliterationTarget = query.getQueryVariable("translitration_target");

export function transliterateDevanagariBody() {
    if (!transliterationTarget) {
        return;
    }
    var textNodes = utils.textNodesUnder(document.getElementsByTagName("body")[0]);
    // console.debug(textNodes);
    textNodes.forEach(function (textNode) {
        textNode.textContent = Sanscript.t(textNode.textContent, "devanagari", transliterationTarget);
    })
}

/* ---- Cookies ---- */
function loadLipi() {
    var lipiEq = LIPI_COOKIE + "=";
    var offset = document.cookie.indexOf(lipiEq);
    if (offset != -1) {
        transliterationTarget = document.cookie.substr(offset + lipiEq.length, 2);
    } else {
        transliterationTarget = LIPI_DEFAULT;
    }
    return chosenLipi;
}

function saveLipi(lipi) {
    transliterationTarget = lipi || LIPI_DEFAULT;
    var date = new Date();
    date.setTime(date.getTime() + LIPI_EXPIRY);
    var addendum = "; expires=" + date.toGMTString() + "; path=/";
    document.cookie = LIPI_COOKIE + "=" + transliterationTarget + addendum;
}