/**
 * Created by JimmDiGriz on 08.06.2017.
 */
var path = require('path');
var webpack = require('webpack');

module.exports = {
    resolve: {
        modules: [
            path.join(__dirname, '../node_modules')
        ],
        extensions: ['.js', '.vue'],
        alias: {
            'vue$': 'vue/dist/vue.js'
        }
    },
    module: {
        loaders: [
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                loader: 'style!css!autoprefixer'
            },
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'url',
                query: {
                    limit: 10000,
                    name: '[name].[ext]?[hash]'
                }
            }
        ]
    }
}