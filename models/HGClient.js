/**
 * Created by JimmDiGriz on 02.02.2017.
 */

'use strict';

let User = require('./User');
let HGApi = require('../modules/hg-api');
let _ = require('lodash');

class HGClient {
    constructor() {
        this.user = null;
    }

    /**
     * @param {function} callback
     **/
    setOnline(callback) {
        if (_.isNull(this.user)) {
            callback('UserIsNotSet');
            return;
        }

        HGApi.goneOnline(this.user,  callback);
    }

    /**
     * @param {function} callback
     **/
    setOffline(callback) {
        if (_.isNull(this.user)) {
            callback('UserIsNotSet');
            return;
        }

        HGApi.goneOffline(this.user,  callback);
    }
}

module.exports = HGClient;