/**
 * Created by JimmDiGriz on 08.06.2017.
 */
var path = require('path')
var config = require('./base');
var webpack = require('webpack')

module.exports = Object.assign({}, config, {
    entry: '../src/app.js',
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'bundle.js',
        library: ['bundle'],
        libraryTarget: 'umd'
    },
    devtool: false,
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"'
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            },
            mangle: false
        }),
        new webpack.optimize.OccurrenceOrderPlugin()
    ]
});