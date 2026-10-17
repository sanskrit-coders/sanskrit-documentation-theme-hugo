const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");


// `webpack --env production` builds the smaller, minified bundle that is
// committed and served by the sites. Plain `webpack` keeps sourcemaps readable
// for local debugging.
module.exports = (env) => ({
    entry: {
        // uiLib.css is also produced.
        uiLib: "./js/uiLib.js",
    },
    output: {
        filename: "[name]-bundle.js",
        path: path.resolve(__dirname, '../static/webpack_dist'),
        libraryTarget: 'var',
        library: 'module_[name]'
    },
    mode: env && env.production ? "production" : "development",
    plugins: [
        new MiniCssExtractPlugin(),
    ],
    module: {
        rules: [
            {
                // MiniCssExtractPlugin for making css file. 
                // Also essential for css import statements in js code.
                test: /.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
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
    optimization: {
        usedExports: true,
        minimizer: [
            // `...` keeps webpack's default JS minimizers (terser) active.
            `...`,
            new CssMinimizerPlugin(),
        ],
    },

});
