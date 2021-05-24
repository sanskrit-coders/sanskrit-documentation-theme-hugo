import * as utils from "./utils";
import Sanscript from "@sanskrit-coders/sanscript";

var suvaggaurvm=4789213;

var suvak_svr0 = 106.67, suvak_svr1 = 120;
var suvak_svritanudatth = suvak_svr0;
var suvak_svritodatth = suvak_svr1;
var suvak_udattpurvanudatth = 100;
var suvak_adisvrh = 100;
var udattadnudattsysvrith=true;
var suvak_vegh=1.0;
var prtikrm_=()=>{};


var context = new AudioContext({sampleRate:48000,latencyHint:"playback"});

export async function setup() {
  var non_webpack_js_base = baseURL + "non_webpack_js/";
  const audioWorkletUrl = new URL(non_webpack_js_base + "suvakworker.js");
  console.log(audioWorkletUrl.href);
  console.log('suvak2.js -> '+location.href);
  function AudioWorklet(url) {
    return url;
  }
  await context.audioWorklet.addModule(new AudioWorklet(audioWorkletUrl));
}

var suvak_reload;
var suvagarbdih=false;
var suvakw=false;


var suvacnm=false;
var suvakkrmh=0;

function speak(vakym) {
	let node = new AudioWorkletNode(context, 'suvak-processor');
	node.port.onmessage = (event) => {
		console.log('message')
		console.log(event)
  };
  let sa=suvak_svr0;
  let su=suvak_svr1;
  let snn=suvak_svr0;
  let adi=suvak_svr0;
  if(suvak_svritanudatth>0)sa=suvak_svritanudatth;
  if(suvak_adisvrh>0)adi=suvak_adisvrh;
  if(suvak_svritodatth>0)su=suvak_svritodatth;
  if(suvak_udattpurvanudatth>0)snn=suvak_udattpurvanudatth;
  node.port.postMessage([vakym,
  	Math.log(suvak_svr0),Math.log(suvak_svr1),Math.log(sa),Math.log(su),Math.log(snn),Math.log(adi),
  	udattadnudattsysvrith,suvak_vegh]);
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



export function speakAll() {
    ttsOn = true;
    speak("ब्रह्मा रुद्रः कुमारो हरिवरुणयमा वह्निरिन्द्रः");
    return;
    // let transliterationSource = pageVars.unicodeScript || "devanagari";
    // var textNodes = utils.textNodesUnder(document.getElementsByTagName("main")[0]);
    // console.debug(textNodes);
    // textNodes.forEach(function (textNode) {
    //     if(textNode.parentNode.nodeName.toLowerCase() != "option") {
    //         // console.debug(textNode.textContent, transliterationSource, transliterationTarget);
    //         let transliteratedText = Sanscript.t(textNode.textContent, transliterationSource, "devanagari");
    //         speak(transliteratedText);
    //
    //     }
    // })
}
