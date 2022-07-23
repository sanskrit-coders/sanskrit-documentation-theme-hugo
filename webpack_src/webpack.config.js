var webpack = require("webpack");
const path = require('path');
module.exports = {
    entry: {
        uiLib: "./js/uiLib.js",
    },
    output: {
        filename: "[name]-bundle.js",
        path: path.resolve(__dirname, '../static/webpack_dist'),
        libraryTarget: 'var',
        library: 'module_[name]'
    },
    mode: "development",
    optimization: {
        usedExports: true
    },
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
            {
                test: /\.(png|jp(e*)g|svg)$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 8000, // Convert images < 8kb to base64 strings
                        name: 'images/[hash]-[name].[ext]'
                    }
                }]
            },
        ]
    },
    
};