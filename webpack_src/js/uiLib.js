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
  let userId = query.getParam(queryFieldName);
  if (userId) {
    console.log(userId);
    document.body.innerHTML = document.body.innerHTML.replace(regexPattern, userId);
    let inputField = document.getElementById(`input_${queryFieldName}`);
    if (inputField) {
      inputField.value = userId;
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
      e.parentNode.setAttribute("hidden", "true");
    } else {
      e.setAttribute("hidden", "true");
    }
  });
  node.getElementsByClassName("fa-external-link-square-alt").forEach(function (e) {
    e.parentNode.setAttribute("hidden", "true");
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
    node.getElementById("expandAllButton").onclick = function () {query.deleteParamAndGo("expandAll");};
  }
}


