/**
 * Created by JimmDiGriz on 08.02.2017.
 */

'use strict';

let HGClient = require('./HGClient');
let HGApi = require('../modules/hg-api');
let statuses = require('../modules/hg-doctor-chat/statuses');
let _ = require('lodash');

class HGChatClient extends HGClient {
    constructor() {
        super();

        this.isPediatrician = false;
        this.status = statuses.AUTHORIZED;
        this.acceptedDoctors = 0;
        this.room = '';
        this.currentAcceptedDoctors = new Set();
        this.participantSocket = null;
        this.workingWithSocket = null;
        this.chatId = null;
    }

    /**
     * @param {function} callback
     **/
    goToChat(callback) {
        if (_.isNull(this.user)) {
            callback(false);
            return;
        }

        HGApi.goToChat(this.user, callback);
    }

    /**
     * @param {function} callback
     **/
    goFromChat(callback) {
        if (_.isNull(this.user)) {
            callback(false);
            return;
        }

        HGApi.goFromChat(this.user, callback);
    }

    updateParticipantSocket(socket) {
        this.participantSocket.hgclient.participantSocket = socket;
    }

    toString() {
        return`
        isPediatrician: ${this.isPediatrician}
        name: ${this.user.name}
        email: ${this.user.email}
        currentStatus: ${this.status}
        hasParticipant: ${this.participantSocket != null}
        chat: ${this.chatId}
        isWorkingWith: ${this.workingWithSocket != null}`;
    }
}

module.exports = HGChatClient;