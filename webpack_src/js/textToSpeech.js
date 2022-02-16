import * as utils from "./utils";
import Sanscript from "@sanskrit-coders/sanscript";

var ekashrutiSvarah = 106.67, udaattaSvarah = 150;
var svaritAnudaattah = ekashrutiSvarah;
var svaritOdaattah = udaattaSvarah;
var sannataraSvarah = 100;
var aadiSvarah = ekashrutiSvarah;
var udaattaadAnudaattasyaSvaritah = true;
var speed = 1.0;



var audioContext;

var audioWorkletNode;

export async function setup() {
    var non_webpack_js_base = baseURL + "non_webpack_js/";
    const audioWorkletUrl = new URL(non_webpack_js_base + "suvakworker.js");
    console.log(audioWorkletUrl.href);
    console.log('suvak2.js -> ' + location.href);
    audioContext = new AudioContext({sampleRate: 48000, latencyHint: "playback"});
    await audioContext.audioWorklet.addModule(audioWorkletUrl);
}

let ttsOn = false;

export function handleSpeakToggle() {
    let speakerButton = document.getElementById("speakerButton");
    if (!ttsOn) {
        speakerButton.classList.add("red")
        speakAll();
    } else {
        speakerButton.classList.remove("red")
        ttsOn = false;
        // console.log("speakToggle", ttsOn);
        // TODO: How to stop?
    }
}

export async function speak(text) {
    await audioContext.resume();
    audioWorkletNode = new AudioWorkletNode(audioContext, 'suvak-processor');
    audioWorkletNode.port.onmessage = (event) => {
        console.log('Message from audio processor received', event);
    };
    audioWorkletNode.connect(audioContext.destination);
    console.log("AudioWorkletNode with suvak-processor created and connected to destination.", audioContext.destination, text);
    // text = "ब्रह्मा रुद्रः कुमारो हरिवरुणयमा वह्निरिन्द्रः";
    audioWorkletNode.port.postMessage([text,
        Math.log(ekashrutiSvarah), Math.log(udaattaSvarah), Math.log(svaritAnudaattah), Math.log(svaritOdaattah), Math.log(sannataraSvarah), Math.log(aadiSvarah),
        udaattaadAnudaattasyaSvaritah, speed]);
}

export async function speakAll() {
    ttsOn = true;
    await setup();
    // speak("ब्रह्मा रुद्रः कुमारो हरिवरुणयमा वह्निरिन्द्रः");
    // return;
    let transliterationSource = pageVars.unicodeScript || "devanagari";
    var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
    console.debug(textNodes);
    let transliteratedText = "";
      textNodes.forEach(function (textNode) {
        if(textNode.parentNode.nodeName.toLowerCase() != "option") {
            // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
            let text = textNode.textContent.trim();
            if (text != "") {
                transliteratedText += " " + Sanscript.t(text, transliterationSource, "devanagari");
            }
        }
    })
    speak(transliteratedText);
}
