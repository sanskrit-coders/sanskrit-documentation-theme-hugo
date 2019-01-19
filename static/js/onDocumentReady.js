function setInlineComments(htmlIn) {
  return htmlIn.replace(/\+\+\+(.+?)\+\+\+/g, "<span class=\"inline_comment\">$1</span>");
}

function setInlineCommentsInPostContent() {
  if ($("#post_content").length > 0) {
    // console.debug( $("#post_content").html);
    // console.log(setInlineComments($("#post_content").html()));
    $("#post_content").html(setInlineComments($("#post_content").html()));
  }
}

function onDocumentReadyTasks() {
  insertSidebarItems();
  // insertTopnavDropdownItems();
  handleIncludes();
  // Update table of contents (To be called whenever page contents are updated).
  updateToc();
  setInlineCommentsInPostContent();
  fillAudioEmbeds();
  fillVideoEmbeds();
  setupDisqus();
}
