import * as query from "./query";

export function setInlineComments(htmlIn) {
    let commentStyle = query.getParam("comment_style") || "on";
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    commentStyleDropdown.value = commentStyle;
    if (commentStyle === "hidden") {
        // console.debug(htmlIn);
        let htmlOut = htmlIn;
        // Handle comment strings which span full line(s).
        htmlOut = htmlOut.replace(/(<br>|<p>)\+\+\+([\s\S]+?)\+\+\+(<br>)?/g, "$1<span class=\"inline_comment\" hidden>$2</span>");
        htmlOut = htmlOut.replace(/\+\+\+([\s\S]+?)\+\+\+/g, "<span class=\"inline_comment\" hidden>$1</span>");
        return htmlOut;
    } else {
        return htmlIn.replace(/\+\+\+([\s\S]+?)\+\+\+/g, "<span class=\"inline_comment\">$1</span>");
    }
}

export function updateCommentStyleFromDropdown() {
    let commentStyleDropdown = document.getElementById("commentStyleDropdown");
    var commentStyle = commentStyleDropdown.options[commentStyleDropdown.selectedIndex].value;
    query.setParamsAndGo({"comment_style": commentStyle});
}
