/**
 * Created by JimmDiGriz on 14.03.2017.
 */

'use strict';

const HGRequest = require('./HGRequest');
const _ = require('lodash');

class HGChatMessage extends HGRequest {
    constructor() {
        super();

        this.chatId = null;
        this.userId = null;
        this.message = null;
        this.createdAt = null;
        this.status = null;
    }

    static get fullValidationFields() {
        return [
            'chatId',
            'userId',
            'message',
            'createdAt',
            'status'
        ];
    }

    static get partialValidationFields() {
        return [
            'chatId',
            'message',
        ];
    }
}

module.exports = HGChatMessage;