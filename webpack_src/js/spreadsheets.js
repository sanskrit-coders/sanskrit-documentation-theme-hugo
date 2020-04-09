import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';

export function fillTable(sheetEmbedTag) {
    let jsonUrl = sheetEmbedTag.getAttribute("src");
    $.getJSON(jsonUrl, function (data) {
        if (data.length > 0) {
            const tableData = [];             // The array to store JSON data.
            let columnWidths = [];
            let row = {};
            for (let key in data[0]) {
                row[key] = key;
                columnWidths.push(20);
            }
            // console.debug(row);
            tableData.push(row);
            $.each(data, function (index, value) {
                let row = [];
                tableData.push(data[index]);
                for (let key in data[index]) {
                    let value = data[index][key];
                    let columnIndex = Object.keys(data[index]).indexOf(key);
                    columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(value.length * 20, 200));
                    // console.debug(value, value.length, columnWidths);
                }
                tableData.push(row);
            });
            // console.debug(tableData);
            const hoTable = new Handsontable(sheetEmbedTag, {
                data: tableData,
                rowHeaders: true,
                colHeaders: true,
                colWidths: columnWidths,
                manualColumnResize: true,
                manualRowResize: true,
                contextMenu: true,
                fixedRowsTop: 1,
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
