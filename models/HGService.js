/**
 * Created by JimmDiGriz on 13.02.2017.
 */

'use strict';

const _ = require('lodash');
const HGError = require('./HGError');
const logger = require('../modules/hg-logger');

class HGService {
    /**
     * @param {Server} io
     **/
    constructor(io) {
        this._io = io;

        this.CONNECTION_EVENT = 'connection';
        this.AUTH_EVENT = 'auth';
        this.ERROR_EVENT = 'error';
        this.DISCONNECT_EVENT = 'disconnect';

        this.CONSOLE_LOGIN = 'console-login';
        this.OUTPUT = 'output-message';
        this.INPUT = 'input';

        this.CONSOLE_ROOM = 'console-room';
    }

    /**
     * @param {string} msg
     * @param {Socket} socket
     **/
    sendError(msg, socket) {
        this.info('SENDING ERROR');
        socket.emit('custom-error', msg);
    }

    /**
     * @param {string} msg
     * @param {Socket} socket
     **/
    processError(msg, socket = null) {
        this.error(msg);

        if (!_.isNil(socket)) {
            this.sendError(msg,  socket);
        }
    }

    /**
     * @param {Socket} socket
     * @param {Error} error
     **/
    errorHandler(socket, error) {
        this.info('ErrorHandler Call');

        if (error instanceof HGError) {
            this.processError(error.message, socket);
            return;
        }

        if (error instanceof Error) {
            /*...*/
            throw error;
        }
    }

    /**
     * @param {string} message
     **/
    info(message, socket = null) {
        logger.info(message);

        if (socket) {
            message = `[ID:${socket.hgclient.user.id}|EMAIL:${socket.hgclient.user.email}]::` + message;
        }

        this._io.to(this.CONSOLE_ROOM).emit(this.OUTPUT, JSON.stringify({level: 'info', message: message}));
    }

    /**
     * @param {string} message
     **/
    debug(message, socket = null) {
        logger.debug(message);

        if (socket) {
            message = `[ID:${socket.hgclient.user.id}|EMAIL:${socket.hgclient.user.email}]::` + message;
        }

        this._io.to(this.CONSOLE_ROOM).emit(this.OUTPUT, JSON.stringify({level: 'debug', message: message}));
    }

    /**
     * @param {string} message
     **/
    error(message, socket = null) {
        logger.error(message);

        if (socket) {
            message = `[ID:${socket.hgclient.user.id}|EMAIL:${socket.hgclient.user.email}]::` + message;
        }

        this._io.to(this.CONSOLE_ROOM).emit(this.OUTPUT, JSON.stringify({level: 'error', message: message}));
    }
}

module.exports = HGService;