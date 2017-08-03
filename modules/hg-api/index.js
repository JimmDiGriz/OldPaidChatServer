/**
 * Created by JimmDiGriz on 02.02.2017.
 */

'use strict';

const request = require('request');
const User = require('../../models/User');
const config = require('../../config');
const routes = require('./routes');
const HGError = require('../../models/HGError');

//request.debug = true;
//require('request-debug')(request);

class HGApi {
    /**
     * @param {User} user
     * @param {function} callback
     **/
    static goneOnline(user, callback) {
        request.put({
            url: HGApi._getUrl(routes.USERS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('online', 1, 'action', 'online')
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static goneOffline(user, callback) {
        request.put({
            url: HGApi._getUrl(routes.USERS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('online', 0, 'action', 'online')
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static goToChat(user, callback) {
        request.put({
            url: HGApi._getUrl(routes.USERS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('status', 1, 'action', 'chat')
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static goFromChat(user, callback) {
        request.put({
            url: HGApi._getUrl(routes.USERS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('status', 0, 'action', 'chat')
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {int} id
     * @param {function} callback
     **/
    static getUserById(user, id, callback) {
        request.get({
            url: HGApi._getUrl(routes.USERS),
            headers: HGApi._getAuthHeaders(user),
            qs: HGApi._getForm('id', id)
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static checkDoctor(user, callback) {
        request.put({
            url: HGApi._getUrl(routes.CHATS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('doctor_id', user.id)
        }, (error, response, data) => {
            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {int} chatId
     * @para, {string} message
     * @param {function} callback
     **/
    static addMessageToChat(user, chatId, message, callback) {
        request.post({
            url: HGApi._getUrl(routes.CHAT_MESSAGES),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('chat_id', chatId, 'message', message)
        }, (error,  response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {string} ids
     * @param {int} type
     * @param {function} callback
     **/
    static createChat(user, ids, type, callback) {
        request.post({
            url: HGApi._getUrl(routes.CHATS),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('user_ids', ids, 'type', type)
        }, (error, response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static incrementSkipped(user, callback) {
        request.post({
            url: HGApi._getUrl(routes.INCREMENT_SKIPPED),
            headers: HGApi._getAuthHeaders(user)
        }, (error, response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {int} chatId
     * @param {function} callback
     **/
    static incrementConducted(user, chatId, callback) {
        request.post({
            url: HGApi._getUrl(routes.INCREMENT_CONDUCTED),
            headers: HGApi._getAuthHeaders(user),
            form: HGApi._getForm('chat_id', chatId)
        }, (error, response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {int} chatId
     * @param {function} callback
     **/
    static incrementFailed(user, callback) {
        request.post({
            url: HGApi._getUrl(routes.INCREMENT_FAILED),
            headers: HGApi._getAuthHeaders(user),
        }, (error, response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {User} user
     * @param {function} callback
     **/
    static getChatStatistic(user, callback) {
        request.get({
            url: HGApi._getUrl(routes.CHAT_STATISTIC),
            headers: HGApi._getAuthHeaders(user)
        }, (error, response, data) => {
            if (error) {
                throw new HGError(data);
            }

            callback(data);
        });
    }

    /**
     * @param {String} route
     *
     * @return {String}
     **/
    static _getUrl(route) {
        return `http://${config.api.host}/${config.api.version}/api/${route}/`;
    }

    /**
     * @param {User} user
     *
     * @return {object}
     **/
    static _getAuthHeaders(user) {
        return {
            'app-id': user.appId,
            'access-token': user.accessToken,
        };
    }

    /**
     * @return {object}
     **/
    static _getForm() {
        let form = {};

        for (let i = 0; i < arguments.length; i++) {
            if (i % 2 != 0) {
                form[arguments[i - 1]] = arguments[i];
            }
        }

        return form;
    }
}

module.exports = HGApi;