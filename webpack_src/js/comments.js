import * as query from "./query";

// Contents of <pre>/<code> (and <script>/<style>, which are code too) are literal
// text: `+++...+++` inside them must be left alone, not turned into a comment.
// `split` with a capturing group keeps the protected blocks as odd-indexed
// parts, so we only run the replacement on the even-indexed (normal) parts.
const PROTECTED_BLOCK_RE = /(<pre\b[^>]*>[\s\S]*?<\/pre\s*>|<code\b[^>]*>[\s\S]*?<\/code\s*>|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)/gi;

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

export function setInlineComments(htmlIn) {
    let commentStyle = query.getParam("comment_style") || "on";
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    commentStyleDropdown.value = commentStyle;
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

export function updateCommentStyleFromDropdown() {
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    var commentStyle = commentStyleDropdown.options[commentStyleDropdown.selectedIndex].value;
    query.setParamsAndGo({"comment_style": commentStyle});
}
