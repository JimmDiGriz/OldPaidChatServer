/**
 * Created by JimmDiGriz on 02.02.2017.
 */

'use strict';

let _ = require('lodash');

class User {
    /**
     * @param {String} appId
     * @param {String} accessToken
     **/
    constructor(appId, accessToken) {
        this.appId = appId;
        this.accessToken = accessToken;
        this.id = null;
        this.name = 'Anon';
        this.email = 'empty@mail.ru';
    }

    validate() {
        let result = true;

        _.forOwn(this, (value) => {
            if (_.isNil(value) || value == '') {
                result = false;
                return false;
            }
        });

        return result;
    }
}

module.exports = User;