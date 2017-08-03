/**
 * Created by JimmDiGriz on 13.02.2017.
 */

'use strict';

let _ = require('lodash');

/**base class for every request*/
class HGRequest {
    constructor() {
        this.userId = null;
        this.accessToken = null;
        this.appId = null;
    }

    /**
     * @param {string} str
     * @param {boolean} validate
     *
     * @return {object|null}
     **/
    static fromString(str, validate = false) {
        let data = null;

        try {
            data = JSON.parse(str);
        } catch (e) {
            console.log(e.message);
            return null;
        }

        let instance = new this();

        _.forOwn(instance, (value, key) => {
            if (!data.hasOwnProperty(key)) {
                return true;
            }

            //console.log(`instance key: ${key}`);

            instance[key] = data[key];
        });

        if (validate) {
            let result = instance.validate([]);

            if (!result) {
                return null;
            }
        }

        return instance;
    }

    /**
     * @param {string[]} fields
     * @param {User} user
     *
     * @return bool
     **/
    validate(fields, user = null) {
        let result = true;

        if (_.isArray(fields) && !_.isEmpty(fields)) {
            _.each(fields, (value) => {
                if (!this.hasOwnProperty(value) || _.isNil(this[value]) || this[value] == '') {
                    result = false;
                    return false;
                }
            });
        } else {
            _.forOwn(this, (value) => {
                if (_.isNil(value) || value == '') {
                    result = false;
                    return false;
                }
            });
        }

        if (result && !_.isNull(user)) {
            if (!this.validateUser(user)) {
                result = false;
            }
        }

        return result;
    }

    /**
     * @param {User} user
     *
     * @return bool
     **/
    validateUser(user) {
        /**auth request here may be*/
        return !(_.isNil(user) || !user.validate()
            || user.accessToken != this.accessToken
            || user.appId != this.appId
            || user.id != this.userId);
    }

    add(key, value) {
        this[key] = value;
    }

    toString() {
        let result = {};

        _.forOwn(instance, (value, key) => {
            if (_.isNil(value)) {
                return true;
            }

            result[key] = value;
        });

        return JSON.stringify(this);
    }

    clear() {
        _.forOwn(this, (value, key) => {
            if (_.isNil(value)) {
                this[key] = undefined;
            }
        });
    }
}

module.exports = HGRequest;