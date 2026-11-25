import * as dirTree from "./dirTree";
import urljoin from 'url-join';

let datalistPopulated = false;

export async function populateTitleDatalist() {
  if (datalistPopulated) {
    return;
  }
  await dirTree.populateTree();
  if (datalistPopulated) {
    return;
  }
  let pageDataList = document.getElementById("pageDataList");
  if (!pageDataList) {
    return;
  }
  datalistPopulated = true;
  const urls = dirTree.getAllPaths(pageRelUrlTree);
  let fragment = document.createDocumentFragment();
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    let pageParams = dirTree.getPageParams(url);
    let title = pageParams["title"] || "";
    let autocompleteText = `${title};;${url}`;
    let option = document.createElement('option');
    option.appendChild(document.createTextNode(autocompleteText));
    fragment.appendChild(option);
  }
  pageDataList.appendChild(fragment);
}

export async function pageLoader() {
  let pageSelected = document.querySelector("#searchInput").value;
  console.log("pageLoader for search input", pageSelected);
  if (pageSelected == "") {
    return;
  }
  let url = pageSelected.split(";;")[1];
  if (!url) {
    await populateTitleDatalist();
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
  let searchInput = document.getElementById("searchInput");
  if (!searchInput || searchInput.dataset.searchBound) {
    return;
  }
  searchInput.dataset.searchBound = "1";
  const triggerPopulate = () => { populateTitleDatalist(); };
  searchInput.addEventListener("focus", triggerPopulate, { once: true });
  searchInput.addEventListener("pointerdown", triggerPopulate, { once: true });
  searchInput.addEventListener("input", triggerPopulate, { once: true });
}