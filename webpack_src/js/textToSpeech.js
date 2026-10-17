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

// Pause (ms, before scaling by `rate`) inserted after the punctuation that
// ends a speech segment. The engine ignores punctuation, so pauses are made
// by splitting the text at these marks and speaking each part separately.
const PUNCTUATION_PAUSE_MS = {
  ",": 150, ";": 200, ":": 200,
  "-": 200, "–": 200, "—": 200,
  "।": 300, "॥": 450,
  ".": 300, "?": 350, "!": 350,
  "\n": 300,
};

// Speech of suvaak utterances split at the punctuation above: each entry is
// spoken once the previous utterance reports "smaptih", after `pauseMs`.
let suvaakQueue = [];
let suvaakTimer = null;
let suvaakPendingPauseMs = 0;
let suvaakPausedInGap = false;

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

// Drop the queue and the pending inter-segment pause timer (starting anew,
// stopping or a worklet abort).
function clearSuvakQueue() {
  suvaakQueue = [];
  suvaakPendingPauseMs = 0;
  suvaakPausedInGap = false;
  if (suvaakTimer !== null) {
    clearTimeout(suvaakTimer);
    suvaakTimer = null;
  }
}

// Speak the next queued segment. When nothing is left, playback is over.
async function speakNextSuvakSegment() {
  if (!ttsOn || !suvaakQueue.length) {
    if (ttsOn) setSpeakerState(false);
    return;
  }
  let segment = suvaakQueue.shift();
  suvaakPendingPauseMs = segment.pauseMs;
  await speakSuvaak(segment.text);
}

// Wait out the pause demanded by the punctuation ending the segment just
// spoken before starting the next one.
function scheduleNextSuvakSegment() {
  // Silence happens naturally while the worklet is idle; `rate` should speed
  // pauses up along with the speech.
  let waitMs = Math.min(Math.max(suvaakPendingPauseMs / rate, 50), 2000);
  console.log("suvak: pausing " + Math.round(waitMs) + " ms between segments");
  suvaakTimer = setTimeout(function () {
    suvaakTimer = null;
    if (!ttsOn || ttsPaused) return;
    speakNextSuvakSegment();
  }, waitMs);
}

function handleSuvakMessage(event) {
  let message = event.data;
  if (Array.isArray(message) && message[0] === "arbdh") {
    // Synthesis started: the first samples are about to play.
    setSpeakerLoading(false);
    console.log("suvak: synthesising " + message[1] + " samples");
  } else if (message === "smaptih") {
    // The utterance was rendered completely.
    setSpeakerLoading(false);
    if (ttsOn && suvaakQueue.length) {
      scheduleNextSuvakSegment();
    } else {
      setSpeakerState(false);
    }
  } else if (message === "reload") {
    console.error("suvak: the speech engine aborted. Reloading the page may help.");
    clearSuvakQueue();
    setSpeakerLoading(false);
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

// Show a spinner in place of the ⏯ glyph while the worklet is loading (the
// worker download can take a while) and the first samples are synthesised.
function setSpeakerLoading(loading) {
  let speakerButton = document.getElementById("speakerButton");
  if (!speakerButton) return;
  let label = speakerButton.dataset.speakerLabel;
  if (loading) {
    if (label !== undefined) return;
    speakerButton.dataset.speakerLabel = speakerButton.innerHTML;
    speakerButton.setAttribute("aria-busy", "true");
    speakerButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
  } else if (label !== undefined) {
    speakerButton.innerHTML = label;
    delete speakerButton.dataset.speakerLabel;
    speakerButton.removeAttribute("aria-busy");
  }
}

export async function handleSpeakToggle() {
  if (!ttsOn) {
    try {
      await startSpeech(TTS_ENGINE);
    } catch (error) {
      console.error("Text-to-speech failed", error);
      setSpeakerLoading(false);
      setSpeakerState(false);
    }
  } else {
    setSpeakerLoading(false);
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
  // The English synthesiser does not pause at dandas.
  speech.text = text.replace(/[।॥]/g, ".");
  window.speechSynthesis.speak(speech);
}

// Dashes pause only when they stand alone between spaces (as in "पदम् - पदम्");
// inside a word ("विश्वास-प्रस्तुतिः", "e-mail") they do not.
const DASH_PAUSE_CHARS = "-–—";

// Split `text` into segments ending at pause punctuation (see
// PUNCTUATION_PAUSE_MS); `pauseMs` is the pause to take after each segment.
// Letterless buffers (verse numbers like "२४.१", punctuation runs) carry no
// speech of their own and are dropped, along with their pauses.
function splitIntoSpeechSegments(text) {
  let segments = [];
  let buffer = "";
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    let pauseMs = PUNCTUATION_PAUSE_MS[char];
    if (DASH_PAUSE_CHARS.includes(char) &&
        !(/\s/.test(text[i - 1] || "") && /\s/.test(text[i + 1] || ""))) {
      pauseMs = undefined;
    }
    if (pauseMs === undefined) {
      buffer += char;
    } else if (/\p{L}/u.test(buffer)) {
      segments.push({text: buffer.trim(), pauseMs: pauseMs});
      buffer = "";
    } else {
      // Only digits/punctuation so far: nothing to speak, so no pause either.
      buffer = "";
    }
  }
  if (/\p{L}/u.test(buffer)) {
    segments.push({text: buffer.trim(), pauseMs: 0});
  }
  return segments;
}

// Text is read aloud unless hidden: content inside a closed <details> and
// summary labels (titles of the details below them) are skipped. Closed
// outer details hide everything nested inside them.
function isReadableTextNode(textNode) {
  let node = textNode.parentElement;
  if (node && node.closest("summary")) return false;
  while (node) {
    if (node.tagName === "DETAILS" && !node.open) return false;
    node = node.parentElement;
  }
  return true;
}

export async function startSpeech(ttsEngine) {
  setSpeakerState(true);
  setSpeakerLoading(true);
  await setup(ttsEngine);
  if (!ttsOn) {
    // Playback was cancelled while the engine was still loading.
    setSpeakerLoading(false);
    return;
  }
  let transliterationSource = pageVars.unicodeScript || "devanagari";
  var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
  let transliteratedText = "";
  textNodes.forEach(function (textNode) {
    if (textNode.parentNode.nodeName.toLowerCase() == "option") return;
    if (!isReadableTextNode(textNode)) return;
    let text = textNode.textContent.trim();
    if (text != "") {
      transliteratedText += " " + Sanscript.t(text, transliterationSource, "devanagari");
    }
  });
  console.log("startSpeech", ttsEngine, transliteratedText.length + " chars");
  switch (ttsEngine) {
    case "WebSynth":
      setSpeakerLoading(false);
      speakWebSynth(transliteratedText);
      break;
    case "suvaak":
      // The spinner stays until the worker reports that synthesis has started
      // (the "arbdh" message), which can lag the click on long pages.
      clearSuvakQueue();
      suvaakQueue = splitIntoSpeechSegments(transliteratedText);
      if (!suvaakQueue.length) {
        setSpeakerLoading(false);
        setSpeakerState(false);
        return;
      }
      await speakNextSuvakSegment();
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
      clearSuvakQueue();
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
      if (suvaakTimer !== null) {
        // Paused during the pause between two segments.
        clearTimeout(suvaakTimer);
        suvaakTimer = null;
        suvaakPausedInGap = true;
      } else if (audioWorkletNode) {
        audioWorkletNode.port.postMessage("pause");
      }
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
      if (suvaakPausedInGap) {
        suvaakPausedInGap = false;
        scheduleNextSuvakSegment();
      } else if (audioWorkletNode) {
        audioWorkletNode.port.postMessage("resume");
      }
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
