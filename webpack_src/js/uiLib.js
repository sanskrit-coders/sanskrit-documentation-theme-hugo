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
  let userId = module_ui_lib.default.getQueryVariable(queryFieldName);
  if (userId) {
    console.log(userId);
    document.body.innerHTML = document.body.innerHTML.replace(regexPattern, userId);
    let inputField = document.getElementById(`input_${queryFieldName}`);
    if (inputField) {
      inputField.value = userId;
    }
  }
}

export function setPrintLayoutFromQuery() {
  let printLayout = query.getQueryVariable("printLayout") || "off";
  if(printLayout != "on") {
    return;
  }
  document.querySelectorAll(".noPrint").forEach(function (e) {
    e.setAttribute("hidden", "true");
  });

  document.getElementsByTagName("summary").forEach(function (e) {
    e.setAttribute("hidden", "true");
  });
  document.getElementsByClassName("fa-external-link-square-alt").forEach(function (e) {
    e.parentNode.setAttribute("hidden", "true");
  });

}


export function updatePrintLayout() {
  let printButton = document.getElementById("printButton");
  query.insertQueryParam("printLayout", "on");
}

// So that these can be used like module_ui_lib.default.getQueryVariable(..).
export default {
  getQueryVariable: query.getQueryVariable,
  insertQueryParam: query.insertQueryParam,
}
