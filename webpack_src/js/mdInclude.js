import toml from 'toml';
import showdown from "showdown";

const yaml = require('js-yaml');
const footnotes = require('showdown-ghost-footnotes');

const showdownConverter = new showdown.Converter({
  strikethrough: true,
  simplifiedAutoLink: true,
  extensions: [footnotes]
});

function getStaticFileEditUrl(jsInclude) {
  var includedPageUrl = jsInclude.getAttribute("url");
  if ((siteParams.githubeditmepathbase || "").includes("github") && includedPageUrl.startsWith("/")) {
    let editUrlParts = siteParams.githubeditmepathbase.match("(.+?github.com/.+?)/(.+?)");
    let urlParts = includedPageUrl.match("/(.+?)/(.+)");
    let repoName = urlParts[1];
    let filePath = urlParts[2];
    let editUrl = `${editUrlParts[1]}/${repoName}/edit/static_files/${filePath}`;
    return editUrl;
  }
  if (includedPageUrl.includes("githubusercontent")) {
    let branch = includedPageUrl.match("https://raw.githubusercontent.com/.+?/.+?/(.+?)/")[1];
    let editUrl = includedPageUrl.replace("https://raw.githubusercontent.com/", "https://github.com/").replace(`/${branch}/`, `/edit/${branch}/`);
    return editUrl;
  }
}

export function markdownToHtml(markdownCode, jsInclude, includedPageUrl) {
  let metadataSeparator = markdownCode.split("\n")[0].trim();
  let mdContent = markdownCode;
  let metadataText = "";
  if (["---", "+++"].includes(metadataSeparator)) {
    metadataText = markdownCode.split(metadataSeparator)[1];
    mdContent = markdownCode.split(metadataSeparator).slice(2).join("+++");
  }

  let metadata = {"title": ""};
  try {
    if (metadataSeparator == "---") {
      metadata = yaml.load(metadataText);
    } else {
      metadata = toml.parse(metadataText);
    }
  } catch (err) {
    let message = `Metadata parse error. Check [file](${includedPageUrl}).`;
    console.error(message);
    mdContent = `${message}\n\n${mdContent}`;
  }
  let metadataJson = JSON.stringify(metadata, null, "  ");
  jsInclude.dataset.metadataJson = metadataJson;
  let fieldNames = jsInclude.getAttribute("fieldNames");
  if (fieldNames) {
    let fieldData = fieldNames.split(",").map(fieldName => {
      let data = metadata[fieldName];
      if (data !== undefined) {
        return `${fieldName} : ${data.toString()}`;
      } else {
        return "";
      }
    });
    mdContent = fieldData.join("\n\n") + "\n\n" + mdContent;
  }
  let metadataDetailName = jsInclude.getAttribute("metadataDetailName");
  if (metadataDetailName != null) {
    if (metadataDetailName == "") {
      metadataDetailName = "Metadata";
    }
    let metadataJsonMd = metadataJson;
    metadataJsonMd = metadataJsonMd.replace(/(\s*[\{\[\]\}])/g, "");
    metadataJsonMd = metadataJsonMd.replace(/(\n +)/g, "$1- ");
    let metadataJsonDetail = `<details><summary>${metadataDetailName}</summary>\n\n${metadataJsonMd}</details>`;
    mdContent = `${metadataJsonDetail}\n\n${mdContent}`;
  }
  let editUrl = getStaticFileEditUrl(jsInclude);
  let editLinkHtml = "";
  if (editUrl) {
    editLinkHtml = `<a id="editLink" href="${editUrl}"></a>`;
  }
  let responseHtml = `<header><h1>${metadata["title"]}</h1>${editLinkHtml}</header><div id="post_content">${showdownConverter.makeHtml(mdContent)}</div>`;
  return responseHtml;
}