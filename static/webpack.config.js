var webpack = require("webpack");
const path = require('path');
module.exports = {
    entry: {
        main: "./js/onDocumentReady.js",
        search: "./js/search.js"
    },
    output: {
        filename: "[name]-bundle.js",
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'var',
        library: 'module_[name]'
    },
    mode: "development",
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ]
};