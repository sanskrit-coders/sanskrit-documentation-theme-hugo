import * as utils from "./utils";
import Sanscript from "@sanskrit-coders/sanscript";

var ekashrutiSvarah = 106.67, udaattaSvarah = 150;
var svaritAnudaattah = ekashrutiSvarah;
var svaritOdaattah = udaattaSvarah;
var sannataraSvarah = 100;
var aadiSvarah = ekashrutiSvarah;
var udaattaadAnudaattasyaSvaritah = true;
var speed = 1.0;



var context = new AudioContext({sampleRate: 48000, latencyHint: "playback"});

var node;

export async function setup() {
    var non_webpack_js_base = baseURL + "non_webpack_js/";
    const audioWorkletUrl = new URL(non_webpack_js_base + "suvakworker.js");
    console.log(audioWorkletUrl.href);
    console.log('suvak2.js -> ' + location.href);

    await context.audioWorklet.addModule(audioWorkletUrl);
}

let ttsOn = false;

export function handleSpeakToggle() {
    let speakerButton = document.getElementsByName("speakerButton")[0];
    if (!ttsOn) {
        speakerButton.classList.add("red")
        speakAll();
    } else {
        speakerButton.classList.remove("red")
        ttsOn = false;
        // TODO: How to stop?
    }
}

export async function speak(text) {
    node = new AudioWorkletNode(context, 'suvak-processor');
    node.port.onmessage = (event) => {
        console.log('Message from audio processor received')
        console.log(event)
    };
    node.connect(context.destination);
    console.log("AudioWorkletNode with suvak-processor created and connected to destination.", context.destination)
    node.port.postMessage([text,
        Math.log(ekashrutiSvarah), Math.log(udaattaSvarah), Math.log(svaritAnudaattah), Math.log(svaritOdaattah), Math.log(sannataraSvarah), Math.log(aadiSvarah),
        udaattaadAnudaattasyaSvaritah, speed]);
}

export function speakAll() {
    ttsOn = true;
    // speak("ब्रह्मा रुद्रः कुमारो हरिवरुणयमा वह्निरिन्द्रः");
    // return;
    let transliterationSource = pageVars.unicodeScript || "devanagari";
    var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
    console.debug(textNodes);
    textNodes.forEach(function (textNode) {
        if(textNode.parentNode.nodeName.toLowerCase() != "option") {
            // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
            let transliteratedText = Sanscript.t(textNode.textContent, transliterationSource, "devanagari");
            speak(transliteratedText);
        }
    })
}
