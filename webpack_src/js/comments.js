import * as query from "./query";

// Contents of <pre>/<code> (and <script>/<style>, which are code too) are literal
// text: `+++...+++` inside them must be left alone, not turned into a comment.
// `split` with a capturing group keeps the protected blocks as odd-indexed
// parts, so we only run the replacement on the even-indexed (normal) parts.
const PROTECTED_BLOCK_RE = /(<pre\b[^>]*>[\s\S]*?<\/pre\s*>|<code\b[^>]*>[\s\S]*?<\/code\s*>|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)/gi;
const SKIP_COMMENT_TAGS = new Set(["PRE", "CODE", "SCRIPT", "STYLE", "TEXTAREA", "OPTION", "TEMPLATE"]);

function replaceOutsideProtected(html, replacer) {
    const parts = html.split(PROTECTED_BLOCK_RE);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            continue;
        }
        parts[i] = replacer(parts[i]);
    }
    return parts.join("");
}

export function setInlineComments(htmlIn, commentStyleIn) {
    let commentStyle = commentStyleIn || query.getParam("comment_style") || "on";
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    if (commentStyleDropdown) {
        commentStyleDropdown.value = commentStyle;
    }
    if (!htmlIn.includes("+++")) {
        return htmlIn;
    }
    if (commentStyle === "hidden") {
        // console.debug(htmlIn);
        return replaceOutsideProtected(htmlIn, function (fragment) {
            let htmlOut = fragment;
            // Handle comment strings which span full line(s).
            htmlOut = htmlOut.replace(/(<br>|<p>)\+\+\+([\s\S]+?)\+\+\+(<br>)?/g, "$1<span class=\"inline_comment\" hidden>$2</span>");
            htmlOut = htmlOut.replace(/\+\+\+([\s\S]+?)\+\+\+/g, "<span class=\"inline_comment\" hidden>$1</span>");
            return htmlOut;
        });
    } else {
        return replaceOutsideProtected(htmlIn, function (fragment) {
            return fragment.replace(/\+\+\+([\s\S]+?)\+\+\+/g, "<span class=\"inline_comment\">$1</span>");
        });
    }
}

function hasDirectPlusText(el) {
    for (let child = el.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3 && child.nodeValue.includes("+++")) {
            return true;
        }
    }
    return false;
}

function applyCommentsToSubtree(el, commentStyle) {
    if (!el || SKIP_COMMENT_TAGS.has(el.tagName)) {
        return;
    }
    const text = el.textContent;
    if (!text || !text.includes("+++")) {
        return;
    }
    // Only rewrite leaf blocks (or elements whose own text nodes hold `+++` and
    // have no nested `<script>`) so we never blow away `document.body` and drop listeners.
    if (el.children.length === 0 || (hasDirectPlusText(el) && !el.querySelector("script"))) {
        const prevHtml = el.innerHTML;
        const nextHtml = setInlineComments(prevHtml, commentStyle);
        if (nextHtml !== prevHtml) {
            el.innerHTML = nextHtml;
        }
        return;
    }
    const children = Array.from(el.children);
    for (let i = 0; i < children.length; i++) {
        applyCommentsToSubtree(children[i], commentStyle);
    }
}

export function applyInlineComments(root) {
    const commentStyle = query.getParam("comment_style") || "on";
    const commentStyleDropdown = document.getElementById("commentStyleDropdown");
    if (commentStyleDropdown) {
        commentStyleDropdown.value = commentStyle;
    }
    const target = root === document.body ? (document.querySelector("main") || document.body) : root;
    if (!target || !target.textContent || !target.textContent.includes("+++")) {
        return;
    }
    applyCommentsToSubtree(target, commentStyle);
}

export function updateCommentStyleFromDropdown() {
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    var commentStyle = commentStyleDropdown.options[commentStyleDropdown.selectedIndex].value;
    query.setParamsAndGo({"comment_style": commentStyle});
}