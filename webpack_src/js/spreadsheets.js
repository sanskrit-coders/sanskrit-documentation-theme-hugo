export async function fillSheets(node) {
    if (!node) return;
    const sheetEmbedTags = [...node.querySelectorAll('.spreadsheet')];
    if (sheetEmbedTags.length === 0) {
        return;
    }
    const { fillSheetsLazy } = await import(/* webpackChunkName: "spreadsheets" */ "./spreadsheetsLazy");
    await fillSheetsLazy(sheetEmbedTags);
}