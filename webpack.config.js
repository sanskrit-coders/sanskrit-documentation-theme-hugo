var webpack = require("webpack");
const path = require('path');
module.exports = {
    entry: {
        main: "./src/main.js",
        search: "./src/search.js"
    },
    output: {
        filename: "[name]-bundle.js",
        path: path.resolve(__dirname, 'static/dist'),
        libraryTarget: 'var',
        library: 'module_[name]'
    },
    mode: "development",
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    
};