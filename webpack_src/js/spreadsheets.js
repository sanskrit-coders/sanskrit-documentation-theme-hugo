import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';
import * as sidebar from "./sidebar";
const json5 = require('json5');
const toml = require('toml');

function fillTableFromJsObject(data, sheetEmbedTag, headerStr) {
    console.debug(sheetEmbedTag);
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
    // Because toml parser makes a js object without hasOwnProperty() method as required by handsontable, we do the below.
    data = JSON.parse(JSON.stringify(data));
    data.forEach(function (item, value) {
        tableData.push(item);
        // console.debug(JSON.stringify(item));
        // console.debug(JSON.stringify(tableData));
        for (let key in item) {
            let value = item[key];
            let columnIndex = Object.keys(item).indexOf(key);
            columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(value.length * 20, 200));
            // console.debug(value, value.length, columnWidths);
        }
    });
    // console.debug(JSON.stringify(tableData));
    console.debug(tableData);
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

function fillJsonTable(sheetEmbedTag) {
    let jsonUrl = sheetEmbedTag.getAttribute("src");
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    $.getJSON(jsonUrl, function (data) {
        if (data.length > 0) {
            fillTableFromJsObject(data, sheetEmbedTag, headerStr);
        }
    });
}

function fillJson5Table(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    $.ajax({
        url: tomlUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                // console.debug(data);
                var jsonData = json5.parse(data);
                fillTableFromJsObject(jsonData, sheetEmbedTag, headerStr);
            }
        }
    });
}

function fillTomlTable(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    $.ajax({
        url: tomlUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                // console.debug(data);
                var jsObj = toml.parse(data);
                fillTableFromJsObject(jsObj.data, sheetEmbedTag, headerStr);
            }
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
        }
    });
}

function fillTable(sheetEmbedTag) {
    let srcUrl = sheetEmbedTag.getAttribute("src");
    if (srcUrl.endsWith("json")) {
        fillJsonTable(sheetEmbedTag);
    } else if (srcUrl.endsWith("tsv") || srcUrl.endsWith("csv")) {
        fillTsvTable(sheetEmbedTag);
    } else if (srcUrl.endsWith("json5")) {
        fillJson5Table(sheetEmbedTag);
    } else if (srcUrl.endsWith("toml")) {
        fillTomlTable(sheetEmbedTag);
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
