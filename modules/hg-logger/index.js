/**
 * Created by JimmDiGriz on 14.03.2017.
 */

'use strict';

const winston = require('winston');

module.exports = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: 'debug'
        })
    ]
});