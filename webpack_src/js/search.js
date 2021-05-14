import 'webpack-jquery-ui';

import * as dirTree from "./dirTree";
import urljoin from 'url-join';

function pageLoader() {
  let pageSelected = $("#searchInput").val();
  if (pageSelected == "") {
    return;
  }
  let url = pageSelected.split(";;")[1];
  window.location = urljoin(baseURL, url);
}

export function setupTitleSearch() {
  // console.debug(sutraBasicsMap);
  let autocompleteList = [];
  const urls = dirTree.getAllPaths(pageRelUrlTree);
  urls.forEach (url  => {
    let pageParams = dirTree.getPageParams(url);
    let title = pageParams["title"] || "";
    let autocompleteText = `${title};;${url}`;
    autocompleteList.push(autocompleteText);
  });
  $("#searchInput").autocomplete({
    source: autocompleteList
  });
  $("#searchInput").change(pageLoader);
}
