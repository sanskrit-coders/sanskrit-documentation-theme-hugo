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
let voices = [];

async function setupSuvaak() {
  if (!audioContext) {
    var non_webpack_js_base = baseURL + "non_webpack_js/";
    const audioWorkletUrl = new URL(non_webpack_js_base + "suvakworker.js");
    console.log(audioWorkletUrl.href);
    console.log('suvak2.js -> ' + location.href);

    audioContext = new AudioContext({sampleRate: 48000, latencyHint: "playback"});
    await audioContext.audioWorklet.addModule(audioWorkletUrl);
  }
}

export async function setupWebSynth() {
  if (!voices.length) {
    voices = window.speechSynthesis.getVoices();
    console.info(voices);
    console.debug(window.speechSynthesis.getVoices());
  }
}

export async function setup(ttsEngine) {
  console.log("setup", ttsEngine);
  switch (ttsEngine) {
    case "WebSynth":
      setupWebSynth();
      break;
    case "suvaak":
      setupSuvaak();
      break;
  }
}

let ttsOn = false;
let ttsVoice = 7;

export function handleSpeakToggle() {
  let speakerButton = document.getElementById("speakerButton");
  let ttsEngine = "suvaak";
  // let ttsEngine = "WebSynth";
  if (!ttsOn) {
    speakerButton.classList.add("red")
    startSpeech(ttsEngine);
  } else {
    speakerButton.classList.remove("red")
    ttsOn = false;
    stopSpeech(ttsEngine);
  }
}

export async function speakSuvaak(text) {
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

export function speakWebSynth(text) {
  console.log("speakWebSynth")
  let speech = new SpeechSynthesisUtterance();
  speech.lang = "en";
  speech.voice = voices[7];
  speech.text = text;
  window.speechSynthesis.speak(speech);
}

export async function startSpeech(ttsEngine) {
  ttsOn = true;
  await setup(ttsEngine);
  // speakSuvaak("ब्रह्मा रुद्रः कुमारो हरिवरुणयमा वह्निरिन्द्रः");
  // return;
  let transliterationSource = pageVars.unicodeScript || "devanagari";
  var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
  // console.debug(textNodes);
  let transliteratedText = "";
  textNodes.forEach(function (textNode) {
    if (textNode.parentNode.nodeName.toLowerCase() != "option") {
      // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
      let text = textNode.textContent.trim();
      if (text != "") {
        transliteratedText += " " + Sanscript.t(text, transliterationSource, "devanagari");
      }
    }
  });
  console.log("startSpeech", ttsEngine);
  switch (ttsEngine) {
    case "WebSynth":
      speakWebSynth(transliteratedText);
      break;
    case "suvaak":
      speakSuvaak(transliteratedText);
      break;
  }
  
}

export function stopSpeech(ttsEngine) {
  console.log("stopSpeech", ttsEngine);
  switch (ttsEngine) {
    case "WebSynth":
      window.speechSynthesis.cancel();
      break;
    case "suvaak":
      audioWorkletNode.disconnect();
      audioWorkletNode = null;
      break;
  }
}


export function pauseSpeech(ttsEngine) {
  console.log("pausing", ttsEngine);
  switch (ttsEngine) {
    case "WebSynth":
      window.speechSynthesis.pause();
      break;
    case "suvaak":
      // TODO: How to pause?
      audioWorkletNode.disconnect();
      break;
  }
}