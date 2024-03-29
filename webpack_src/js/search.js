import * as dirTree from "./dirTree";
import urljoin from 'url-join';

export function pageLoader() {
  let pageSelected = document.querySelector("#searchInput").value;
  console.log("pageLoader for search input", pageSelected);
  if (pageSelected == "") {
    return;
  }
  let url = pageSelected.split(";;")[1];
  window.location = urljoin(baseURL, url);
}

export function setupTitleSearch() {
  const urls = dirTree.getAllPaths(pageRelUrlTree);
  let fragment = document.createDocumentFragment();
  let pageDataList = document.getElementById("pageDataList")
  urls.forEach (url  => {
    let pageParams = dirTree.getPageParams(url);
    let title = pageParams["title"] || "";
    let autocompleteText = `${title};;${url}`;
    let option = document.createElement('option');
    let text = document.createTextNode(autocompleteText);
    option.appendChild(text);
    // Keep html size low - avoid the below.
    // option.value = url;
    fragment.appendChild(option);
  });
  pageDataList.appendChild(fragment);
}
