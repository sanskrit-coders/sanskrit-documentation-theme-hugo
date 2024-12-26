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
            columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(value.toString().length * 20, 200));
            // console.debug(value, value.toString().length, columnWidths);
        }
    });
    let height = .8*screen.availHeight;
    if (sheetEmbedTag.hasAttribute("fullHeightWithRowsPerScreen")) {
        height = height * Math.ceil(data.length / sheetEmbedTag.getAttribute("fullHeightWithRowsPerScreen"));
    }
    let width = columnWidths.reduce((a, b) => a + b, 0);
    console.debug(columnWidths, width);
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
        width: width,
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

async function fillJsonTable(sheetEmbedTag) {
    let jsonUrl = sheetEmbedTag.getAttribute("src");
    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data.length > 0) {
            fillTableFromJsObject(data, sheetEmbedTag);
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

async function fillJson5Table(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    try {
        const response = await fetch(tomlUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();

        if (data.length > 0) {
            // console.debug(data);
            const jsonData = JSON5.parse(data);
            fillTableFromJsObject(jsonData, sheetEmbedTag);
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

async function fillTomlTable(sheetEmbedTag) {
    let tomlUrl = sheetEmbedTag.getAttribute("src");
    try {
        const response = await fetch(tomlUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();

        if (data.length > 0) {
            // console.debug(data);
            const jsObj = toml.parse(data);
            fillTableFromJsObject(jsObj.data, sheetEmbedTag);
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

async function fillTsvTable(sheetEmbedTag) {
    let tsvUrl = sheetEmbedTag.getAttribute("src");
    let separatorStr = sheetEmbedTag.getAttribute("separator") || "\t";

    try {
        const response = await fetch(tsvUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();

        if (data.length > 0) {
            const lines = data.split("\n");
            const tableData = []; // The array to store parsed data.

            lines.forEach(line => {
                const values = line.split(separatorStr);
                tableData.push(values);
            });

            fillTableFromJsObject(tableData, sheetEmbedTag);
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

async function fillTable(sheetEmbedTag) {
    let srcUrl = sheetEmbedTag.getAttribute("src");
    if (srcUrl.endsWith("json")) {
        await fillJsonTable(sheetEmbedTag);
    } else if (srcUrl.endsWith("tsv") || srcUrl.endsWith("csv")) {
        await fillTsvTable(sheetEmbedTag);
    } else if (srcUrl.endsWith("json5")) {
        await fillJson5Table(sheetEmbedTag);
    } else if (srcUrl.endsWith("toml")) {
        await fillTomlTable(sheetEmbedTag);
    } else {
        console.error("Don't know how to deal with this file type: " + srcUrl)
    }
}

export function fillSheets(node) {
    var sheetEmbedTags = [...node.querySelectorAll('.spreadsheet')];
    sheetEmbedTags.forEach(function (sheetEmbedTag) {
        fillTable(sheetEmbedTag);
    });
}
