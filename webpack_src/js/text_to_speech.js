// import * as suvak from '../node_modules/suvak/suvak';
import * as utils from "./utils";
import Sanscript from "@sanskrit-coders/sanscript";

let ttsOn = false;

export function handleSpeakToggle() {
    let speakerButton = document.getElementsByName("speakerButton")[0];
    if (!ttsOn) {
        speakerButton.classList.add("red")
        speakAll();
    } else {
        speakerButton.classList.remove("red")
        // TODO: How to stop?
    }
}
    


export function speakAll() {
    ttsOn = true;
    let transliterationSource = pageVars.unicodeScript || "devanagari";
    var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
    console.debug(textNodes);
    textNodes.forEach(function (textNode) {
        if(textNode.parentNode.nodeName.toLowerCase() != "option") {
            // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
            let transliteratedText = Sanscript.t(textNode.textContent, transliterationSource, "devanagari");
            suvak.bhaashasva(transliteratedText, 100, 150);
        }
    })
}
