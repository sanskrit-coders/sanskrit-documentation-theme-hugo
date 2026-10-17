import * as utils from "./utils";
import Sanscript from "@indic-transliteration/sanscript";

// Svaras (pitch accents) emitted by the suvaak engine, in Hz.
var ekashrutiSvarah = 106.67, udaattaSvarah = 150;
var svaritAnudaattah = ekashrutiSvarah;
var svaritOdaattah = udaattaSvarah;
var sannataraSvarah = 100;
var aadiSvarah = ekashrutiSvarah;
// When true, a svarita immediately after an udatta is rendered as a svarita.
var udaattaadAnudaattasyaSvaritah = true;

const TTS_ENGINE = "suvaak";

// Bump when the suvakworker.js message protocol changes: the version shows up
// in the AudioWorklet URL, so browsers fetch the matching worker past caches.
const SUVAK_WORKER_VERSION = "2";

var audioContext;
var audioWorkletNode;
var masterGain;
let voices = [];

// Playback state.
let ttsOn = false;
let ttsPaused = false;

// User controls (the Vol/Rate/Pitch sliders in the 🎧 dropdown).
let volume = 1.0;
let rate = 1.0;
let pitch = 1.0;

async function setupSuvaak() {
  if (audioContext) return;
  var audioWorkletUrl = new URL(baseURL + "non_webpack_js/suvakworker.js?v=" + SUVAK_WORKER_VERSION);
  console.log("Loading suvak AudioWorklet from " + audioWorkletUrl.href);
  audioContext = new AudioContext({sampleRate: 48000, latencyHint: "playback"});
  try {
    // The worker is a few megabytes (compiled engine + voice data), so this
    // can take a while on a slow connection.
    await audioContext.audioWorklet.addModule(audioWorkletUrl);
    audioWorkletNode = new AudioWorkletNode(audioContext, "suvak-processor");
    masterGain = audioContext.createGain();
    masterGain.gain.value = volume;
    audioWorkletNode.connect(masterGain).connect(audioContext.destination);
    audioWorkletNode.port.onmessage = handleSuvakMessage;
  } catch (error) {
    // Leave no half-initialised state behind, so a retry can start over.
    await audioContext.close().catch(() => {});
    audioContext = undefined;
    audioWorkletNode = undefined;
    masterGain = undefined;
    throw error;
  }
}

function handleSuvakMessage(event) {
  let message = event.data;
  if (Array.isArray(message) && message[0] === "arbdh") {
    console.log("suvak: synthesising " + message[1] + " samples");
  } else if (message === "smaptih") {
    // The utterance was rendered completely.
    setSpeakerState(false);
  } else if (message === "reload") {
    console.error("suvak: the speech engine aborted. Reloading the page may help.");
    setSpeakerState(false);
  } else {
    console.debug("suvak:", message);
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
      await setupWebSynth();
      break;
    case "suvaak":
      await setupSuvaak();
      break;
  }
}

// Reflect playback state on the ⏯ button.
function setSpeakerState(on) {
  ttsOn = on;
  if (!on) ttsPaused = false;
  let speakerButton = document.getElementById("speakerButton");
  if (speakerButton) speakerButton.classList.toggle("red", on);
}

export async function handleSpeakToggle() {
  if (!ttsOn) {
    try {
      await startSpeech(TTS_ENGINE);
    } catch (error) {
      console.error("Text-to-speech failed", error);
      setSpeakerState(false);
    }
  } else {
    setSpeakerState(false);
    stopSpeech(TTS_ENGINE);
  }
}

export function handlePauseToggle() {
  if (!ttsOn) return;
  ttsPaused = !ttsPaused;
  if (ttsPaused) {
    pauseSpeech(TTS_ENGINE);
  } else {
    resumeSpeech(TTS_ENGINE);
  }
}

export async function speakSuvaak(text) {
  await audioContext.resume();
  // `pitch` scales every svara frequency; `rate` is the speaking speed.
  let svaraLogFrequencies = [
    ekashrutiSvarah, udaattaSvarah, svaritAnudaattah, svaritOdaattah, sannataraSvarah, aadiSvarah,
  ].map(frequency => Math.log(frequency * Math.max(pitch, 0.1)));
  audioWorkletNode.port.postMessage([
    text,
    ...svaraLogFrequencies,
    udaattaadAnudaattasyaSvaritah,
    rate,
  ]);
}

export function speakWebSynth(text) {
  let speech = new SpeechSynthesisUtterance();
  speech.lang = "en";
  speech.voice = voices[7];
  speech.text = text;
  window.speechSynthesis.speak(speech);
}

export async function startSpeech(ttsEngine) {
  setSpeakerState(true);
  await setup(ttsEngine);
  if (!ttsOn) {
    // Playback was cancelled while the engine was still loading.
    return;
  }
  let transliterationSource = pageVars.unicodeScript || "devanagari";
  var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
  let transliteratedText = "";
  textNodes.forEach(function (textNode) {
    if (textNode.parentNode.nodeName.toLowerCase() != "option") {
      let text = textNode.textContent.trim();
      if (text != "") {
        transliteratedText += " " + Sanscript.t(text, transliterationSource, "devanagari");
      }
    }
  });
  console.log("startSpeech", ttsEngine, transliteratedText.length + " chars");
  switch (ttsEngine) {
    case "WebSynth":
      speakWebSynth(transliteratedText);
      break;
    case "suvaak":
      await speakSuvaak(transliteratedText);
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
      if (audioWorkletNode) audioWorkletNode.port.postMessage("stop");
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
      if (audioWorkletNode) audioWorkletNode.port.postMessage("pause");
      break;
  }
}

export function resumeSpeech(ttsEngine) {
  console.log("resuming", ttsEngine);
  switch (ttsEngine) {
    case "WebSynth":
      window.speechSynthesis.resume();
      break;
    case "suvaak":
      if (audioWorkletNode) audioWorkletNode.port.postMessage("resume");
      break;
  }
}

// Wire the Vol/Rate/Pitch sliders in the 🎧 dropdown. Uses event delegation
// on `document` because the page body is re-rendered (via innerHTML) while
// includes are being processed, which drops listeners bound to its children.
let audioControlsReady = false;

export function setupAudioControls() {
  if (audioControlsReady) return;
  audioControlsReady = true;
  document.addEventListener("input", function (event) {
    let slider = event.target;
    let value = Number(slider.value);
    switch (slider.id) {
      case "volume":
        volume = value;
        if (masterGain) masterGain.gain.value = value;
        break;
      case "rate":
        rate = value;
        break;
      case "pitch":
        pitch = value;
        break;
      default:
        return;
    }
    let label = document.getElementById(slider.id + "-label");
    if (label) label.textContent = value;
  });
}
