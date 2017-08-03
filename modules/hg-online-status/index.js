/**
 * Created by JimmDiGriz on 02.02.2017.
 */

'use strict';

const HGApi = require('../hg-api');
const HGClient = require('../../models/HGClient');
const User = require('../../models/User');
const _ = require('lodash');
const HGService = require('../../models/HGService');
const HGError = require('../../models/HGError');

class HGOnlineStatusService extends HGService {
    /**
     * @param {Server} io
     **/
    constructor(io) {
        super(io);
    }

    init() {
        let onAuthHandler = (socket, data) => {
            this.info('Client Try To Auth');

            this.debug(data);

            data = JSON.parse(data);

            let client = new HGClient();
            client.user = new User(data.appId, data.accessToken);

            client.setOnline(() => {
                socket.hgclient = client;
                this.info('Client Goes Online');
            });
        };

        let onDisconnectHandler = (socket) => {
            if (_.isNil(socket.hgclient)) {
                this.info('Anonymous Client Disconnected');
                return;
            }

            let client = socket.hgclient;

            this.info('Authenticated User Disconnected');

            client.setOffline(() => {
                this.info('Client Goes Offline');

                delete socket.hgclient;
            });
        };

        this._io.on(this.CONNECTION_EVENT, (socket) => {
            this.info('Client Connect');

            //this._io.of('/').adapter.clients(function (err, clients) {
            //    console.log(clients); // an array containing all connected socket ids
            //});

            socket.unique(this.AUTH_EVENT, (data) => { onAuthHandler(socket, data); });
            socket.unique(this.DISCONNECT_EVENT, () => { onDisconnectHandler(socket); });

            socket.unique(this.ERROR_EVENT, (error) => { this.errorHandler(socket,error); });
        });

        return this;
    }
}

module.exports = HGOnlineStatusService;