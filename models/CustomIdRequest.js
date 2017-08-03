/**
 * Created by JimmDiGriz on 17.02.2017.
 */

'use strict';

let HGRequest = require('./HGRequest');

class CustomIdRequest extends HGRequest {
    constructor() {
        super();

        this.id = null;
    }
}

module.exports = CustomIdRequest;