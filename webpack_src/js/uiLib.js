import 'bootstrap/dist/css/bootstrap.min.css';
import 'tachyons/css/tachyons.min.css';

// The below don't yield equally good results[??], so omitting and including separately.
// import '@fortawesome/fontawesome-free/js/fontawesome';
// import '@fortawesome/fontawesome-free/js/solid';

import "../css/treeview.css";
import "../css/class_styles.css";

import * as copyButtons from "./copyButtons";
import * as query from "./query";
import * as transliteration from "./transliteration";
import * as audioEmbed from "./audioEmbed";
import * as videoEmbed from "./videoEmbed";
import * as spreadsheets from "./spreadsheets";
import {updateToc} from "./toc";
import * as dirTree from "./dirTree";
import * as sidebar from "./sidebar";
import * as indexes from "./indexes";
import * as search from "./search";
import handleIncludes from "./handleIncludes";
import {redirectToPage, redirectToRandomPage} from "./redirect";
import * as comments from "./comments";
import * as textToSpeech from "./textToSpeech";
import * as utils from "./utils";

let bootstrapLiteReady = false;
let readyTasksStarted = false;

// Backward compatibility for legacy pages (e.g. random.md) referencing module_dir_tree.
if (typeof window !== "undefined") {
    window.module_dir_tree = dirTree;
}

function resolveSelectorTargets(selector) {
    if (!selector || selector === "#") return [];
    if (selector.startsWith("#") && !/[ .,:>\[\]+~]/.test(selector.slice(1))) {
        const el = document.getElementById(selector.slice(1));
        return el ? [el] : [];
    }
    try {
        return Array.from(document.querySelectorAll(selector));
    } catch (e) {
        return [];
    }
}

function closeOpenDropdowns(exceptDropdown) {
    document.querySelectorAll(".dropdown-menu.show").forEach(menu => {
        const parent = menu.closest(".dropdown");
        if (exceptDropdown && parent === exceptDropdown) return;
        menu.classList.remove("show");
        if (parent) {
            parent.classList.remove("show");
            const btn = parent.querySelector('[data-toggle="dropdown"]');
            if (btn) btn.setAttribute("aria-expanded", "false");
        }
    });
}

// Lightweight delegated replacement for Bootstrap's collapse and dropdown JS
// (avoids bundling ~520 KB of jQuery + Popper + Bootstrap JS).
function setupBootstrapLite() {
    if (bootstrapLiteReady) return;
    bootstrapLiteReady = true;

    document.addEventListener("click", function (event) {
        const collapseTrigger = event.target.closest('[data-toggle="collapse"]');
        if (collapseTrigger) {
            if (collapseTrigger.tagName === "A") event.preventDefault();
            const selector = collapseTrigger.getAttribute("data-target") || collapseTrigger.getAttribute("href");
            const targets = resolveSelectorTargets(selector);
            let isShown = false;
            targets.forEach(t => {
                isShown = t.classList.toggle("show");
            });
            collapseTrigger.setAttribute("aria-expanded", String(isShown));
            collapseTrigger.classList.toggle("collapsed", !isShown);
            return;
        }

        const dropdownTrigger = event.target.closest('[data-toggle="dropdown"]');
        if (dropdownTrigger) {
            event.preventDefault();
            const dropdown = dropdownTrigger.closest(".dropdown") || dropdownTrigger.parentElement;
            const menu = dropdown ? dropdown.querySelector(".dropdown-menu") : null;
            if (!menu) return;
            const willOpen = !menu.classList.contains("show");
            closeOpenDropdowns(dropdown);
            menu.classList.toggle("show", willOpen);
            dropdown.classList.toggle("show", willOpen);
            dropdownTrigger.setAttribute("aria-expanded", String(willOpen));
            return;
        }

        if (!event.target.closest(".dropdown-menu.show")) {
            closeOpenDropdowns(null);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeOpenDropdowns(null);
        }
    });
}

export function relUrlOfCurrentPage() {
    return document.location.href.split("#")[0].replace(baseURL, "/");
}

// No includes processing - or adding navigation bars.
export async function prepareContentWithoutIncludes(node) {
    const isRootCall = !node;
    if (!node) {
        node = document.body;
        transliteration.loadLipi();
    }
    // Only rewrite leaf blocks containing `+++` instead of rewriting document.body.innerHTML.
    comments.applyInlineComments(node);
    await transliteration.transliterate(node);
    audioEmbed.fillAudioEmbeds(node);
    videoEmbed.fillVideoEmbeds(node);
    await spreadsheets.fillSheets(node);

    // Doing the below before inclusion also -  
    // so that unnecessary include processing can be avoided.
    if (isRootCall) {
        const mainEl = document.querySelector("body main");
        if (mainEl) {
            expandDetails(mainEl);
            collectDetails(mainEl);
        }
        setPrintColsFromQuery(document.body);
    } else {
        expandDetails(node);
        setPrintColsFromQuery(node);
    }
}

async function ensureMathjaxLoadedIfNeeded() {
    if (typeof window === "undefined") return;
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    const text = mainEl.textContent || "";
    const hasMath = /@#|\$\$|\\\(|\\\[/.test(text);
    if (!hasMath) return;

    if (window.MathJax && window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([mainEl]).catch(e => console.warn("MathJax typeset failed:", e));
        return;
    }

    if (window.__sdMathjaxUrl && !document.getElementById("MathJax-script")) {
        const { MATHJAX_TEX_COMMANDS } = await import(/* webpackChunkName: "mathjaxMacros" */ "./mathjaxMacros");
        const macroSpan = document.createElement("span");
        macroSpan.style.display = "none";
        macroSpan.textContent = MATHJAX_TEX_COMMANDS;
        document.body.prepend(macroSpan);

        window.MathJax = {
            tex: {
                inlineMath: [["@#", "#@"], ["\\(", "\\)"]],
                displayMath: [["$$", "$$"], ["\\[", "\\]"]],
                processEscapes: true,
            },
            svg: { fontCache: 'global' },
            options: { ignoreHtmlClass: "tex2jax_ignore|dno" }
        };
        const script = document.createElement("script");
        script.id = "MathJax-script";
        script.async = true;
        script.src = window.__sdMathjaxUrl;
        document.head.appendChild(script);
    }
}

export function finalizePagePostInclusion() {
    expandDetails(document.querySelector("body main"));
    collectDetails(document.querySelector("body main"));
    setPrintColsFromQuery(document.body);
    updateToc();
    collapsibleSections();
    copyButtons.copyablePres();
    ensureMathjaxLoadedIfNeeded();
    const sdThemeDoneEvent = new CustomEvent('sdThemeDone', {detail: {someData: 'example'}});
    console.log("Dispatching sdThemeDoneEvent", sdThemeDoneEvent);
    document.dispatchEvent(sdThemeDoneEvent);
}

function initCurrentPageVarsFromHugo() {
    if (!pageVars.pageParams || Object.keys(pageVars.pageParams).length === 0) {
        pageVars.pageParams = dirTree.getPageParams(pageVars.pageUrlMinusBasePath);
    }
    const defaults = (typeof pageDefaults !== "undefined" && pageDefaults) ? pageDefaults : {};
    pageVars.sidebarId = pageVars.pageParams.sidebar || defaults.sidebar;
    pageVars.topnavId = pageVars.pageParams.topnav || defaults.topnav;
    pageVars.footernavId = pageVars.pageParams.footernav || defaults.footernav;
    pageVars.unicodeScript = pageVars.pageParams.unicode_script || defaults.unicode_script;
}

export async function preLoadTasks() {
    console.log("preLoadTasks");
    await dirTree.populateTree();
    if (!pageVars.pageParams || Object.keys(pageVars.pageParams).length === 0) {
        pageVars.pageParams = dirTree.getPageParams(pageVars.pageUrlMinusBasePath);
    }
    initCurrentPageVarsFromHugo();
}

function needsDirTreeForNav(items) {
    if (!items || typeof items[Symbol.iterator] !== "function") return false;
    for (let item of items) {
        if (!item.title && !item.contents) return true;
        if (item.url && (item.url.startsWith("dir://") || item.url.startsWith("recdir://"))) return true;
        if (item.contents && needsDirTreeForNav(item.contents)) return true;
    }
    return false;
}

function setPageNavigation() {
    let nextPage = dirTree.getNextPage(pageVars.pageUrlMinusBasePath);
    dirTree.setAnchor(document.getElementById("nextPage"), nextPage, ">");
    dirTree.setAnchor(document.getElementById("nextPageFoot"), nextPage, ">");
    let previousPage = dirTree.getPreviousPage(pageVars.pageUrlMinusBasePath);
    dirTree.setAnchor(document.getElementById("previousPage"), previousPage, "<");
    dirTree.setAnchor(document.getElementById("previousPageFoot"), previousPage, "<");

    function goNext() {
        console.log("Next triggered", nextPage[dirTree.pageRelUrlTreeMETAkey].absUrl);
        redirectToPage(nextPage[dirTree.pageRelUrlTreeMETAkey].absUrl);
    }

    function goPrevious() {
        console.log("Previous triggered", previousPage);
        redirectToPage(previousPage[dirTree.pageRelUrlTreeMETAkey].absUrl);
    }

    document.addEventListener("keydown", function (event) {
        // Next: Ctrl + Right Arrow
        if ((event.ctrlKey && event.key === "ArrowRight")) {
            event.preventDefault();
            goNext();
        }

        // Previous: Ctrl + Left Arrow
        if ((event.ctrlKey && event.key === "ArrowLeft")) {
            event.preventDefault();
            goPrevious();
        }
    });
}

export async function onDocumentReadyTasks() {
    if (readyTasksStarted) {
        return;
    }
    readyTasksStarted = true;
    setupBootstrapLite();
    initCurrentPageVarsFromHugo();
    textToSpeech.setupAudioControls();
    search.setupTitleSearch();

    const deferTopnav = pageVars.topnavId && sidebarsData[pageVars.topnavId] && needsDirTreeForNav(sidebarsData[pageVars.topnavId]);
    const deferFooternav = pageVars.footernavId && sidebarsData[pageVars.footernavId] && needsDirTreeForNav(sidebarsData[pageVars.footernavId]);

    if (!deferTopnav && pageVars.topnavId && sidebarsData[pageVars.topnavId]) {
        sidebar.insertNavItems("top-bar-right-custom", sidebarsData[pageVars.topnavId]);
    }
    if (!deferFooternav && pageVars.footernavId && sidebarsData[pageVars.footernavId]) {
        sidebar.insertNavItems("footer-bar-right-custom", sidebarsData[pageVars.footernavId]);
    }
    if (pageVars.unicodeScript) {
        // Some layouts (eg. 404.html) have no #post_content element.
        let postContent = document.querySelector("#post_content");
        if (postContent) postContent.setAttribute("unicode_script", pageVars.unicodeScript);
    }

    // Load site index concurrently so page content, TOC, includes and sdThemeDone
    // don't block on fetching/building the site-wide directory tree.
    const treeReadyPromise = dirTree.populateTree().then(() => {
        if (deferTopnav) {
            sidebar.insertNavItems("top-bar-right-custom", sidebarsData[pageVars.topnavId]);
        }
        if (deferFooternav) {
            sidebar.insertNavItems("footer-bar-right-custom", sidebarsData[pageVars.footernavId]);
        }
        sidebar.insertSidebarItems();
        sidebar.setupSidebarToggle();
        setPageNavigation();
    });

    await prepareContentWithoutIncludes();
    if (!handleIncludes()) {
        // handleIncludes spawns threads which independently call the below.
        finalizePagePostInclusion();
    }
    await treeReadyPromise;
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { onDocumentReadyTasks(); });
    } else {
        onDocumentReadyTasks();
    }
}

export function replaceWithQueryParam(queryFieldName, regexPattern) {
    let value = query.getParam(queryFieldName);
    if (value) {
        document.body.innerHTML = document.body.innerHTML.replace(regexPattern, value);
        let inputField = document.getElementById(`input_${queryFieldName}`);
        if (inputField) {
            inputField.value = value;
        }
    }
}

export function collapsibleSections() {
    let printCols = query.getParam("printCols") || "notPrintView";
    if (printCols != "notPrintView") {
        return;
    }
    const root = document.querySelector("main") || document;
    for (let level = 2; level < 7; level++) {
        let levelHs = Array.from(root.querySelectorAll(`h${level}`));
        levelHs = levelHs.filter(h2 => !h2.closest('summary'));

        for (let i = 0; i < levelHs.length - 1; i++) {
            const currentH = levelHs[i];
            if (currentH.hasAttribute("hasDetail")) {
                continue;
            }

            // Create <details> and <summary>
            const details = document.createElement('details');
            details.setAttribute("open", "true");
            details.classList.add("headingDetail");
            const summary = document.createElement('summary');
            summary.textContent = "🦅🦍…🐒🐍";
            details.appendChild(summary);

            // Collect all nodes between startH and next higher/equal heading
            let currentNode = currentH.nextSibling;

            function isHigherHeading(node) {
                return node && node.nodeName.toLowerCase().startsWith("h") && parseInt(node.nodeName.charAt(1)) <= level;
            }

            while (currentNode && !isHigherHeading(currentNode)) {
                let nextNode = currentNode.nextSibling;
                // Append _after_ finding nextSibling!
                details.appendChild(currentNode);
                currentNode = nextNode;
            }

            let parent = currentH.parentNode;
            const nextElem = currentH.nextElementSibling;
            if (nextElem) {
                parent.insertBefore(details, nextElem);
            } else {
                parent.appendChild(details);
            }
            currentH.setAttribute("hasDetail", "true");
        }
    }
}

export function updatePrintStyle() {
    console.log("updatePrintStyle entered");
    let bodyFontSize = document.getElementById("tbBodyFontSize").value;
    let printCols = document.getElementById("tbColumns").value;
    let includeStyle = document.getElementById("tbIncludeStyle").value;
    query.setParamsAndGo({"printCols": printCols, "bodyFontSize": bodyFontSize, "includeStyle": includeStyle});
}

export function setPrintColsFromQuery(node) {
    if (!node) return;
    let printCols = query.getParam("printCols") || "notPrintView";
    if (printCols == "notPrintView") {
        return;
    }
    let includeStyle = query.getParam("includeStyle") || "true";
    const mainTag = document.querySelector('main');

    let infoTag = document.querySelector("#infoTag");
    if (!infoTag) {
        infoTag = document.createElement("small");
        infoTag.setAttribute("id", "infoTag");
        infoTag.innerHTML = `<a href='${document.location}'>Web</a>`;
        if (includeStyle != "true") {
            infoTag.innerHTML += "\n(noInc)";
        }
        let titleTag = document.querySelector("h1");
        if (titleTag) {
            titleTag.parentNode.insertBefore(infoTag, titleTag);
        }
    }

    console.log("setprintColsFromQuery", printCols, includeStyle);
    mainTag.style.columnCount = printCols;

    let bodyFontSize = query.getParam("bodyFontSize");
    if (bodyFontSize) {
        document.body.style.fontSize = bodyFontSize;
    }

    [...node.querySelectorAll(".noPrint")].forEach(function (e) {
        e.setAttribute("hidden", "true");
    });
    [...node.querySelectorAll("#disqus_thread")].forEach(function (e) {
        e.setAttribute("hidden", "true");
    });
    let expandDetailsParam = query.getParam("expandDetails") || "false";
    [...node.getElementsByTagName("summary")].forEach(function (e) {
        if (!e.parentNode.hasAttribute("open")) {
            e.parentNode.hidden = true;
        } else {
            if (e.parentNode.classList.contains("headingDetail")) {
                // Just hide the summary tag.
                e.hidden = true;
            }
            if (expandDetailsParam == "false") {
                if (e.textContent.includes("विश्वास-प्रस्तुतिः")) {
                    // Just hide the summary tag.
                    e.hidden = true;
                }
                if (includeStyle != "1" && e.firstChild) {
                    e.firstChild.textContent = e.firstChild.textContent.replace("...{Loading}...", "").trim();
                }
            }
        }
    });
    [...node.getElementsByClassName("fa-external-link-square-alt")].forEach(function (e) {
        e.parentNode.hidden = true;
    });
}

export function expandDetails(node) {
    if (!node) return;
    let detailsPattern = query.getParam("expandDetails") || "false";
    let highlightPattern = query.getParam("highlightDetails") || "विश्वास-टिप्पनी.*";
    if (detailsPattern == "false") {
        return;
    }
    [...node.getElementsByTagName("details")].forEach(function (e) {
        if (e.hasAttribute("open")) {
            e.setAttribute("preOpened", "true");
        } else {
            let summary = e.querySelector("summary");
            let titleMatch = summary && summary.textContent.trim().match(detailsPattern);
            if (titleMatch) {
                e.setAttribute("open", "true");
            }
        }
    });
    [...node.getElementsByTagName("details")].forEach(function (details) {
        const summary = details.querySelector('summary');
        let titleMatch = summary && summary.textContent.trim().match(highlightPattern);
        if (titleMatch) {
            details.classList.add('highlight');
        }
    });
    if (node.tagName && node.tagName.toLowerCase() == "body") {
        document.querySelector("#expandAllButton").onclick = function () {
            query.deleteParamsAndGo(["expandDetails"]);
        };
    }
}

export function collectDetails(node) {
    if (!node) return;
    let collectPattern = query.getParam("collectDetails") || null;
    if (!collectPattern) {
        return;
    }

    let collectedDetails =
        document.querySelector(`details.AutoCollection[target="${collectPattern}"]`);
    if (collectedDetails) {
        console.info("collectDetails already exists - skipping.");
        return;
    }
    collectedDetails = document.createElement('details');
    collectedDetails.open = true;
    collectedDetails.setAttribute("class", "AutoCollection");
    collectedDetails.setAttribute("target", collectPattern);
    const collectedSummary = document.createElement('summary');
    collectedSummary.textContent = `यन्त्र-सङ्ग्रहः (${collectPattern})`;
    collectedDetails.appendChild(collectedSummary);

    // Container inside details to hold collected contents
    const container = document.createElement('div');

    [...node.getElementsByTagName("details")].forEach(function (details) {
        const summary = details.querySelector('summary');
        let titleMatch = summary && summary.textContent.trim().match(collectPattern) && summary.textContent.trim() != collectedSummary.textContent;
        if (titleMatch) {
            const cloneContent = Array.from(details.childNodes)
                .filter(n => n !== summary)
                .map(n => n.cloneNode(true));

            cloneContent.forEach(n => container.appendChild(n));
        }
        if (container.childNodes.length > 0) {
            collectedDetails.appendChild(container);
            let detailContainer = document.querySelector(`div.AutoCollection[target="${collectPattern}"]`) || document.querySelector("#post_content");
            if (!document.querySelector(`details.AutoCollection[target="${collectPattern}"]`)) {
                detailContainer.prepend(collectedDetails);
            }
        }
    });
}

export function getFontSize(element) {
    let size = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
    return size;
}


export function changeTextSize(diff) {
    const mainTag = document.querySelector('main');

    let size = getFontSize(mainTag);
    console.debug(size);
    size = size + diff;
    mainTag.style.fontSize = size + "px";
}

// Functions exported in this very file can be accessed like - module_uiLib.changeTextSize.  
// But for others, we use the below, so that they may be accessed as module_uiLib.default.redirectToPage(..).
export default {
    navigation: {
        sidebarToggleHandler: sidebar.sidebarToggleHandler,
        pageLoader: search.pageLoader,
        redirectToPage: redirectToPage,
        redirectToRandomPage: redirectToRandomPage,
        loadDataListFromTSV: indexes.loadDataListFromTSV,
        loadDropdownFromTSV: indexes.loadDropdownFromTSV
    },
    content: {
        updateTransliteration: transliteration.updateTransliteration,
        handleSpeakToggle: textToSpeech.handleSpeakToggle,
        handlePauseToggle: textToSpeech.handlePauseToggle,
        updateCommentStyleFromDropdown: comments.updateCommentStyleFromDropdown,
        updatePrintStyle: updatePrintStyle,
        getPageParams: dirTree.getPageParams,
        changeTextSize: changeTextSize,
        handleIncludes: handleIncludes
    },
    query: {
        deleteParamsAndGo: query.deleteParamsAndGo,
        setParamsAndGo: query.setParamsAndGo,
        getParam: query.getParam,
    }
}