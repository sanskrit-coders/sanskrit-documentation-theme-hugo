import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';

export function fillTable(sheetEmbedTag) {
    let jsonUrl = sheetEmbedTag.getAttribute("src");
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    $.getJSON(jsonUrl, function (data) {
        if (data.length > 0) {
            const tableData = [];             // The array to store JSON data.
            let columnWidths = [];
            let headers = [];
            if (headerStr === "") {
                for (let key in data[0]) {
                    headers.push(key);
                    columnWidths.push(20);
                }
            } else {
                headerStr.split(",")
            }
            console.debug(headerStr, headers);
            $.each(data, function (index, value) {
                tableData.push(data[index]);
                for (let key in data[index]) {
                    let value = data[index][key];
                    let columnIndex = Object.keys(data[index]).indexOf(key);
                    columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(value.length * 20, 200));
                    // console.debug(value, value.length, columnWidths);
                }
            });
            // console.debug(tableData);
            const hoTable = new Handsontable(sheetEmbedTag, {
                data: tableData,
                rowHeaders: true,
                colHeaders: headers,
                colWidths: columnWidths,
                manualColumnResize: true,
                manualRowResize: true,
                contextMenu: true,
                fixedRowsTop: 1,
                minSpareRows: 1,
                columnSorting: true,
                bindRowsWithHeaders: true,
                manualColumnFreeze: true,
                licenseKey: 'non-commercial-and-evaluation'
            });
        }
    });

}

export function fillSheets() {
    var sheetEmbedTags = document.querySelectorAll('.spreadsheet');
    sheetEmbedTags.forEach(function (sheetEmbedTag) {
        fillTable(sheetEmbedTag);
    });
}
