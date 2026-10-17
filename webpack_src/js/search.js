import * as dirTree from "./dirTree";
import urljoin from 'url-join';

export function pageLoader() {
  let pageSelected = document.querySelector("#searchInput").value;
  console.log("pageLoader for search input", pageSelected);
  if (pageSelected == "") {
    return;
  }
  let url = pageSelected.split(";;")[1];
  if (!url) {
    // The user typed text instead of choosing a datalist entry. If it
    // matches exactly one page title, load that page.
    let matches = Array.from(document.querySelectorAll("#pageDataList option"))
      .filter(option => option.textContent.startsWith(pageSelected));
    if (matches.length === 1) {
      url = matches[0].textContent.split(";;")[1];
    }
  }
  if (!url) {
    console.warn("Could not determine a page URL from search input:", pageSelected);
    return;
  }
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
