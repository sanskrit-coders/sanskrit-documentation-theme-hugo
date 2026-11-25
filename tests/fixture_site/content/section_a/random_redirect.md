+++
title = "Random Redirect Page"
+++

<div name="manualRedirectionDiv"></div>

<script>
function getSelectionWeight(url) {
  var cleanedUrl = url.replace("//", "/");
  let pageParams = module_dir_tree.getPageParams(cleanedUrl);
  if (!cleanedUrl.startsWith("/section_b/") || pageParams.logicalName === "_index.md") {
    return 0;
  }
  return 1;
}
module_uiLib.default.navigation.redirectToRandomPage(getSelectionWeight, document.getElementsByName("manualRedirectionDiv")[0], false);
</script>
