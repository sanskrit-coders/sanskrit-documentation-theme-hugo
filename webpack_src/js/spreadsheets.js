import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';
import * as sidebar from "./sidebar";

function fillJsonTable(sheetEmbedTag) {
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
            // console.debug(screen.availWidth);
            const hoTable = new Handsontable(sheetEmbedTag, {
                data: tableData,
                rowHeaders: true,
                colHeaders: headers,
                colWidths: columnWidths,
                stretchH: 'all',
                height: .8*screen.availHeight,
                // rowHeights: '100px',
                // preventOverflow: false,
                manualColumnResize: true,
                manualRowResize: true,
                contextMenu: true,
                autoWrapRow: false,
                autoWrapCol: false,
                // fixedRowsTop: 1,
                minSpareRows: 1,
                columnSorting: true,
                bindRowsWithHeaders: true,
                manualColumnFreeze: true,
                licenseKey: 'non-commercial-and-evaluation'
            });
            sidebar.setupSidebarToggle();
        }
    });

}

function fillTsvTable(sheetEmbedTag) {
    let tsvUrl = sheetEmbedTag.getAttribute("src");
    let separatorStr = sheetEmbedTag.getAttribute("separator") || "\t";
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    $.ajax({
        url: tsvUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                var lines = data.split("\n");
                const tableData = [];             // The array to store JSON data.
                let columnWidths = [];
                let headers = [];
                if (headerStr === "") {
                    let keys = lines[0].split(separatorStr);
                    for (let index in keys) {
                        headers.push(keys[index]);
                        columnWidths.push(20);
                    }
                    lines = lines.splice(1);
                    // console.debug(lines);
                } else {
                    headerStr.split(",")
                }
                console.debug(headerStr, headers);
                $.each(lines, function (index, line) {
                    var values = line.split(separatorStr);
                    tableData.push(values);
                    for (let columnIndex in values) {
                        let value = values[columnIndex];
                        columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(value.length * 20, 200));
                        // console.debug(value, value.length, columnWidths);
                    }
                });
                // console.debug(screen.availWidth);
                const hoTable = new Handsontable(sheetEmbedTag, {
                    data: tableData,
                    rowHeaders: true,
                    colHeaders: headers,
                    colWidth
                    s: columnWidths,
                    stretchH: 'all',
                    height: .8*screen.availHeight,
                    // rowHeights: '100px',
                    // preventOverflow: false,
                    manualColumnResize: true,
                    manualRowResize: true,
                    contextMenu: true,
                    autoWrapRow: false,
                    autoWrapCol: false,
                    // fixedRowsTop: 1,
                    minSpareRows: 1,
                    columnSorting: true,
                    bindRowsWithHeaders: true,
                    manualColumnFreeze: true,
                    licenseKey: 'non-commercial-and-evaluation'
                });
                sidebar.setupSidebarToggle();
            }
        }
    });
}

function fillTable(sheetEmbedTag) {
    let srcUrl = sheetEmbedTag.getAttribute("src");
    if (srcUrl.endsWith("json")) {
        fillJsonTable(sheetEmbedTag);
    } else if (srcUrl.endsWith("tsv")) {
        fillTsvTable(sheetEmbedTag);
    } else {
        console.error("Don't know how to deal with this file type: " + srcUrl)
    }
}

export function fillSheets() {
    var sheetEmbedTags = document.querySelectorAll('.spreadsheet');
    sheetEmbedTags.forEach(function (sheetEmbedTag) {
        fillTable(sheetEmbedTag);
    });
}
