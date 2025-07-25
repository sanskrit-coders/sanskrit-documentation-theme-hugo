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
        const result = await navigator.permissions.query({ name: "clipboard-write" });
        if (result.state == "granted" || result.state == "prompt") {
            console.debug("Copying using Clipboard API");
            await navigator.clipboard.writeText(codeToCopy);
            console.debug("Copied using Clipboard API");
        } else {
            console.debug("Clipboard API permission not granted, falling back to execCommand");
            copyCodeBlockExecCommand(codeToCopy, copyableDiv);
        }
    } catch (err) {
        console.error("Error using Clipboard API:", err);
        console.debug("Falling back to execCommand due to error in Clipboard API");
        copyCodeBlockExecCommand(codeToCopy, copyableDiv);
    } finally {
        codeWasCopied(button);
    }
}

function copyCodeBlockExecCommand(codeToCopy, copyableDiv) {
    console.debug("Attempting to copy using execCommand");
    let textArea = copyableDiv.querySelector('textarea.copyable-text-area');

    if (!textArea) {
        textArea = document.createElement("textArea");
        textArea.className = "copyable-text-area";
        // Make it read-only so the user can't edit, but script can select
        textArea.readOnly = true;
        // Hide it visually but keep it in the DOM for selection
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        textArea.style.top = '0px';
        copyableDiv.insertBefore(textArea, copyableDiv.firstChild);
    }

    textArea.value = codeToCopy;

    // Select the text within the textarea
    textArea.select();
    if (textArea.setSelectionRange) {
        textArea.setSelectionRange(0, 999999); // For mobile Safari
    } else {
        // Fallback for older browsers
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    let success = false;
    try {
        success = document.execCommand("copy");
        console.debug("execCommand copy successful:", success);
    } catch (err) {
        console.error("execCommand copy failed:", err);
    } finally {
        // Always remove the temporary textarea
        if (textArea.parentNode === copyableDiv) {
            copyableDiv.removeChild(textArea);
        }
    }
}

function codeWasCopied(button) {
    button.blur();
    button.textContent = "Copied!";
    setTimeout(function () {
        button.textContent = "Copy";
    }, 2000);
}