/**
 * Created by JimmDiGriz on 31.01.2017.
 */

'use strict';

const app = require('express')();
const server = require('http').Server(app);
let config = require('./config');

server.listen(process.env.PORT || config.port);

let io = require('socket.io')(server);
let Emitter = require('events').EventEmitter;

const _ = require('lodash');

Emitter.prototype.unique = function (eventName, callback) {
    if (this.listenerCount(eventName) < 1) {
        this.on(eventName, callback);
        return;
    }

    let isAlreadyListens = false;

    _.each(this.listeners(eventName),  (listener) => {
        if (listener.toString() === callback.toString()) {
            isAlreadyListens = true;
            return false;
        }
    });

    if (!isAlreadyListens) {
        this.on(eventName, callback);
    }
};

Emitter.defaultMaxListeners = Infinity;

const redis = require('socket.io-redis');

const logger = require('./modules/hg-logger');

io.adapter(redis(config.redis));

for (let prop in config.io) {
    if (config.io.hasOwnProperty(prop)) {
        io.set(prop, config.io[prop]);
    }
}

process.on('uncaughtException', (err) => {
    logger.info('UncaughtExceptionHandler Call');

    if (err.message) {
        logger.error(err.stack);
        logger.error(err.message);
    }

    if (err.socket) {
        logger.info('UncaughtExceptionHandler Emit Error To Socket');
        err.socket.emit('error', err);
    }
});

process.on('warning', (err) => {
    logger.warn(err.message);
});

/**
 * Socket Services
 **/
const HGOnlineStatusService = new (require('./modules/hg-online-status'))(io).init();
const HGDoctorChat = new (require('./modules/hg-doctor-chat'))(io.of('/doctor-chat')).init();
