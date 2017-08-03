/**
 * Created by JimmDiGriz on 17.02.2017.
 */

'use strict';

class HGError extends Error {
    constructor(message, socket) {
        super();

        this.message = message;
        this.socket = socket;
    }
}

module.exports = HGError;