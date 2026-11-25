import Handsontable from "handsontable";
import 'handsontable/dist/handsontable.full.css';
import * as sidebar from "./sidebar";
import * as utils from "./utils";
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
        headers = headerStr.split(",");
        for (let i = 0; i < headers.length; i++) {
            columnWidths.push(20);
        }
    }
    // Because toml parser makes a js object without hasOwnProperty() method as required by handsontable, we do the below.
    data = JSON.parse(JSON.stringify(data));
    data.forEach(function (item) {
        tableData.push(item);
        const itemKeys = Object.keys(item);
        for (let key in item) {
            let value = item[key];
            let columnIndex = itemKeys.indexOf(key);
            let valueLength = (value === null || value === undefined) ? 0 : value.toString().length;
            columnWidths[columnIndex] = columnWidths[columnIndex] || 20;
            columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], Math.min(valueLength * 20, 200));
        }
    });
    let height = .8 * screen.availHeight;
    if (sheetEmbedTag.hasAttribute("fullHeightWithRowsPerScreen")) {
        height = height * Math.ceil(data.length / sheetEmbedTag.getAttribute("fullHeightWithRowsPerScreen"));
    }
    let width = columnWidths.reduce((a, b) => a + b, 0);
    console.debug(columnWidths, width);
    console.debug(sheetEmbedTag.hasAttribute("fullHeight"), height);

    let tableElement = document.createElement("div");
    sheetEmbedTag.appendChild(tableElement);
    new Handsontable(tableElement, {
        data: tableData,
        rowHeaders: true,
        colHeaders: headers,
        colWidths: columnWidths,
        stretchH: 'all',
        height: height,
        width: width,
        manualColumnResize: true,
        manualRowResize: true,
        contextMenu: true,
        autoWrapRow: false,
        autoWrapCol: false,
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
        const data = await utils.fetchJson(jsonUrl);

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
        const data = await utils.fetchText(tomlUrl);

        if (data.length > 0) {
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
        const data = await utils.fetchText(tomlUrl);

        if (data.length > 0) {
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
        const data = await utils.fetchText(tsvUrl);

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
        console.error("Don't know how to deal with this file type: " + srcUrl);
    }
}

export async function fillSheetsLazy(sheetEmbedTags) {
    await Promise.all(sheetEmbedTags.map(tag => fillTable(tag)));
}