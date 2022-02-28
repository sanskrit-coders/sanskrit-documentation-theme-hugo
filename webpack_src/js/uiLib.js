import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tachyons/css/tachyons.min.css';

// The below don't yield equally good results, so omitting.
// import '@fortawesome/fontawesome-free/js/fontawesome';
// import '@fortawesome/fontawesome-free/js/solid';
// import "../css/fonts.css";
import "../css/treeview.css";
import "../css/class_styles.scss";

import * as query from "./query";


export function replaceWithQueryParam(queryFieldName, regexPattern) {
  let value = query.getParam(queryFieldName);
  if (value) {
    document.body.innerHTML = document.body.innerHTML.replace(regexPattern, value);
    // WARNING: Because of the above replacement(?), the below does not work as of 202202. Employ some other idea.
    let inputField = document.getElementById(`input_${queryFieldName}`);
    console.log("replaceWithQueryParam", queryFieldName, value, inputField, Boolean(inputField), document.getElementById(`input_${queryFieldName}`).value);
    if (inputField) {
      inputField.value = value;
      // document.getElementById(`input_${queryFieldName}`).value = value;
    }
  }
}

export function setPrintLayoutFromQuery(node) {
  let printLayout = query.getParam("printLayout") || "off";
  if(printLayout != "on") {
    return;
  }
  node.querySelectorAll(".noPrint").forEach(function (e) {
    e.setAttribute("hidden", "true");
  });

  node.getElementsByTagName("summary").forEach(function (e) {
    if (!e.parentNode.hasAttribute("open")) {
      e.parentNode.hidden = true;
    } else {
      e.hidden = true;
    }
  });
  node.getElementsByClassName("fa-external-link-square-alt").forEach(function (e) {
    e.parentNode.hidden = true;
  });

}

export function expandAllDetails(node) {
  let expandAll = query.getParam("expandAll") || "false";
  if(expandAll != "true") {
    return;
  }
  node.getElementsByTagName("details").forEach(function (e) {
    if (e.hasAttribute("open")) {
      e.setAttribute("preOpened", "true");
    } else {
      e.setAttribute("open", "true");
    }
  });
  if (node.tagName.toLocaleLowerCase() == "body") {
    document.querySelector("#expandAllButton").onclick = function () {query.deleteParamAndGo("expandAll");};
  }
}


