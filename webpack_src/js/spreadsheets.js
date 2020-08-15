import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';
import * as sidebar from "./sidebar";
const json5 = require('json5');
const toml = require('toml');

function fillTableFromJsObject(data, sheetEmbedTag) {
    console.debug(sheetEmbedTag);
    const tableData = [];             // The array to store JSON data.
    let columnWidths = [];
    let headers = [];
    let headerStr = sheetEmbedTag.getAttribute("headers") || "";
    if (headerStr === "") {
        for (let key in data[0]) {
            headers.push(key);
            columnWidths.push(20);
        }
    } else {
        headerStr.split(",")
    }
    // console.debug(headerStr, headers);
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
    let height = .8*screen.availHeight;
    if (sheetEmbedTag.hasAttribute("fullHeightWithRowsPerScreen")) {
        height = height * Math.ceil(data.length / sheetEmbedTag.getAttribute("fullHeightWithRowsPerScreen"));
    }
    console.debug(sheetEmbedTag.hasAttribute("fullHeight"), height);
    // console.debug(JSON.stringify(tableData));
    // console.debug(tableData);
    // console.debug(screen.availWidth);
    
    let tableElement = document.createElement ("div");
    sheetEmbedTag.appendChild(tableElement);
    const hoTable = new Handsontable(tableElement, {
        data: tableData,
        rowHeaders: true,
        colHeaders: headers,
        colWidths: columnWidths,
        stretchH: 'all',
        height: height,
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
    $.getJSON(jsonUrl, function (data) {
        if (data.length > 0) {
            fillTableFromJsObject(data, sheetEmbedTag);
        }
    });
}

function fillJson5Table(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    $.ajax({
        url: tomlUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                // console.debug(data);
                var jsonData = json5.parse(data);
                fillTableFromJsObject(jsonData, sheetEmbedTag);
            }
        }
    });
}

function fillTomlTable(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    $.ajax({
        url: tomlUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                // console.debug(data);
                var jsObj = toml.parse(data);
                fillTableFromJsObject(jsObj.data, sheetEmbedTag);
            }
        }
    });
}

function fillTsvTable(sheetEmbedTag) {
    let tsvUrl = sheetEmbedTag.getAttribute("src");
    let separatorStr = sheetEmbedTag.getAttribute("separator") || "\t";
    $.ajax({
        url: tsvUrl,
        type: "GET",
        dataType: "text",
        mimeType: "text/plain",
        success: function(data){
            if (data.length > 0) {
                var lines = data.split("\n");
                const tableData = [];             // The array to store JSON data.
                $.each(lines, function (index, line) {
                    var values = line.split(separatorStr);
                    tableData.push(values);
                });
                fillTableFromJsObject(tableData, sheetEmbedTag);
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
