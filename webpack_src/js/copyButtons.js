export function createCopyButton(copyableDiv) {
    const button = document.createElement("button");
    button.className = "copy-code-button";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", () =>
        copyCodeToClipboard(button, copyableDiv)
    );
    copyableDiv.insertBefore(button, copyableDiv.firstChild);
}

async function copyCodeToClipboard(button, copyableDiv) {
    const codeToCopy = button.nextElementSibling.textContent;
    try {
        result = await navigator.permissions.query({name: "clipboard-write"});
        if (result.state == "granted" || result.state == "prompt") {
            console.debug("Copying");
            await navigator.clipboard.writeText(codeToCopy);
            console.debug("Copied");
        } else {
            copyCodeBlockExecCommand(codeToCopy, copyableDiv);
        }
    } catch (_) {
        copyCodeBlockExecCommand(codeToCopy, copyableDiv);
    } finally {
        codeWasCopied(button);
    }
}

function copyCodeBlockExecCommand(codeToCopy, copyableDiv) {
    console.debug("Copying");
    let textArea = copyableDiv.querySelector('textarea');
    if (!textArea) {
        textArea = document.createElement("textArea");
        textArea.contentEditable = "true";
        textArea.readOnly = "false";
        textArea.className = "copyable-text-area";
        // textArea.hidden = "true";
        textArea.value = codeToCopy;
        copyableDiv.insertBefore(textArea, copyableDiv.firstChild);
    }
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    textArea.setSelectionRange(0, 999999);
    document.execCommand("copy");
    // copyableDiv.removeChild(textArea);
}

function codeWasCopied(button) {
    button.blur();
    button.textContent = "Copied!";
    setTimeout(function () {
        button.textContent = "Copy";
    }, 2000);
}

