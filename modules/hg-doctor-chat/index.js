/**
 * Created by JimmDiGriz on 02.02.2017.
 */

'use strict';

const HGApi = require('../hg-api');
const HGChatClient = require('../../models/HGChatClient');
const User = require('../../models/User');
const HGRequest = require('../../models/HGRequest');
const CustomIdRequest = require('../../models/CustomIdRequest');
const HGService = require('../../models/HGService');
const randomString = require('randomstring');
const _ = require('lodash');
const HGError = require('../../models/HGError');
const HGChatMessage = require('../../models/HGChatMessage');

const Events = require('./events');
const Statuses = require('./statuses');

const Config = require('../../config');

const Console = require('../console');

class HGDoctorChat extends HGService {
    /**
     * @param {Server} io
     **/
    constructor(io) {
        super(io);

        this._io.adapter.clientsMap = new Map(); /**@todo: change it to redis*/

        this.PRIVATE_DOCTOR_CHAT_TYPE = 1;

        this._restoreHandlers = new Map();

        this._initConsole();

        this.serviceConsoleKey = 'test'; //temp, remove for normal login later

        this.consoleInput = null;
    }

    _initConsole() {
        this.con = new Console();

        this.con.on('commands', () => { this.info(this.con.list()); }, 'List of available commands.');
        this.con.on('clients', () => { this.dumpClients(); }, 'List of connected authorized chat clients.');
        this.con.on('ids', () => { this.dumpClientsMapKeys(); }, 'List of connected authorized user ids.');
        this.con.on('pending', () => { this.dumpClientsMapKeys(); }, 'List of doctors in pending room.');
    }

    get restoreHandlers() {
        if (this._restoreHandlers.size == 0) {
            this._restoreHandlers.set(Statuses.AUTHORIZED, this.restoreAuthorized);
            this._restoreHandlers.set(Statuses.PENDING, this.restorePending);
            this._restoreHandlers.set(Statuses.FOUNDED, this.restoreFounded);
            this._restoreHandlers.set(Statuses.CHOSEN, this.restoreChosen);
            this._restoreHandlers.set(Statuses.WAITING_PAYMENT, this.restoreWaitingPayment);
            this._restoreHandlers.set(Statuses.SEARCHING, this.restoreSearching);
            this._restoreHandlers.set(Statuses.CHOOSING, this.restoreChoosing);
            this._restoreHandlers.set(Statuses.PAYMENT, this.restorePayment);
            this._restoreHandlers.set(Statuses.IN_CHAT, this.restoreInChat);
        }

        return this._restoreHandlers;
    }

    dumpClientsMapKeys() {
        let iterator = this._io.adapter.clientsMap.keys();
        let result = [];
        for (let key of iterator) {
            result.push(key);
        }

        this.debug(JSON.stringify(result));
    }

    dumpClients() {
        let iterator = this._io.adapter.clientsMap.keys();
        let result = [];
        for (let key of iterator) {
            result.push(this._io.adapter.clientsMap.get(key).hgclient.toString());
        }

        //this.debug(JSON.stringify(result));
        this.debug(result);
    }

    getClientById(id) {
        let socket = this._io.adapter.clientsMap.get(id);

        if (!socket) {
            throw new HGError();
        }

        return [socket, socket.hgclient];
    }

    consoleInput(socket, data) {
        this.info('ConsoleInput Call');

        data = JSON.parse(data);

        this.con.execute(data.command);
    }

    consoleLogin(socket, data) {
        this.info('ConsoleLogin Call');

        data = JSON.parse(data);
        this.debug(data);

        if (!data.authKey) {
            throw new HGError('AuthKeyMissing');
        }

        if (data.authKey != this.serviceConsoleKey) {
            throw new HGError('InvalidAuthKey');
        }

        socket.join(this.CONSOLE_ROOM, () => {
            this.info('ConsoleLogin Successful');

            socket.emit(this.CONSOLE_LOGIN);

            socket.unique(this.INPUT, (data) => {
                this.info('ConsoleInput Call');

                data = JSON.parse(data);

                this.con.execute(data.command);
            });
        });
    }

    init() {
        this._io.on(this.CONNECTION_EVENT, (socket) => {
            this.info('Client Connect To Doctor Chat');

            //this._io.adapter.clients(function (err, clients) {
            //    console.log(clients); // an array containing all connected socket ids
            //});

            socket.unique(this.CONSOLE_LOGIN, (data) => { this.consoleLogin(socket, data); });

            this.info("Transport: " + socket.conn.transport.name);

            socket.unique(this.ERROR_EVENT, (error) => { this.errorHandler(socket, error); });

            var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

            this.debug('IP: ' + clientIpAddress);

            if (clientIpAddress == '127.0.0.1') {
                socket.unique('test', (data) => { this.info('Test:' + data); });
                return;
            }

            socket.unique(this.AUTH_EVENT, (data) => { this.onAuth(socket, data); });
            socket.unique(this.DISCONNECT_EVENT, () => { this.onDisconnect(socket); });
        });

        return this;
    }

    softDisconnect(socket) {
        this.info('SoftDisconnect Call');

        socket.removeAllListeners(this.DISCONNECT_EVENT, () => { this.onDisconnect(socket); });

        socket.disconnect();
    }

    onDisconnect(socket) {
        //this.dumpClientsMapKeys();
        if (_.isNil(socket.hgclient)) {
            this.info('Anonymous Client Disconnected Doctor Chat');
            return;
        }

        let client = socket.hgclient;

        this.info('Authenticated User Disconnected Doctor Chat', socket);

        client.goFromChat((response) => {
            let user = JSON.parse(response);
            this.debug(user.id + ':' + user.email);

            if (!response) {
                throw new HGError('User Is Not Set');
            }

            this.info('Chat Client Goes Offline');

            let r = new HGRequest();
            r.add('id', client.user.id);
            r.clear();

            //try {
                if (!_.isNil(client.participantSocket)) {
                    this.info("Try To Emit Participant Lost", client.participantSocket);
                    this.debug(`Id: ${client.participantSocket.hgclient.user.id}; ChatId: ${client.participantSocket.hgclient.chatId}`);
                    this.debug(`Id: ${client.user.id}; ChatId: ${client.chatId}`);
                    client.participantSocket.emit(Events.PARTICIPANT_LOST, r);

                    if (client.participantSocket.hgclient.isPediatrician) {
                        client.participantSocket.hgclient.participantSocket = null;

                        this.info('Returning Doctor To Pending', client.participantSocket);

                        client.participantSocket.hgclient.workingWithSocket = null;

                        this.onJoinInRoster(client.participantSocket);
                    }
                } else {
                    if (client.isPediatrician && !_.isNil(client.workingWithSocket)) {
                        this.info("Emit Doctor Lost To: " + client.workingWithSocket.hgclient.user.id, client.workingWithSocket);
                        client.workingWithSocket.emit(Events.DOCTOR_LOST, r);

                        _.remove(client.workingWithSocket.hgclient.currentAcceptedDoctors, (d) => {
                            return d.id == socket.id;
                        });
                    } else if (!client.isPediatrician && client.currentAcceptedDoctors.size > 0) {
                        // fix client lost, cleaning
                        for (let d of client.currentAcceptedDoctors) {
                            this.info("Try To Emit Client Lost", d);
                            d.emit(Events.CLIENT_LOST, r);

                            d.hgclient.workingWithSocket = null;

                            this.onJoinInRoster(d);
                        }
                    }
                }
            //} catch (e) {
            //
            //}

            this._io.adapter.clientsMap.delete(socket.hgclient.user.id);
            //this.dumpClientsMapKeys();
            //delete socket.hgclient;
        });
    }

    onAuth(socket, data) {
        socket.removeAllListeners(this.AUTH_EVENT, (data) => { this.onAuth(socket, data); });
        this.info('Chat Client Try To Auth');
        this.debug(socket.id);
        this.debug(data);
        //this.dumpClientsMapKeys();

        data = HGRequest.fromString(data);

        if (!data.validate(['accessToken', 'appId'])) {
            throw new HGError('Request Validation Failed');
        }

        let client = new HGChatClient();
        client.user = new User(data.appId, data.accessToken);

        client.goToChat((response) => {
            let user = JSON.parse(response);
            this.debug(user.id + ':' + user.email);

            if (!response) {
                throw new HGError('User Is Not Set');
            }

            response = JSON.parse(response);

            client.user.id = response.id;
            client.user.name = `${response.first_name} ${response.last_name}`;
            client.user.email = response.email;


            //this.debug(response);

            if (response.specialistInfo != null && response.specialistInfo != '') {
                this.info('Specialist Try To Auth');
                client.isPediatrician = true;

                socket.unique(Events.JOIN_IN_DOCTORS_ROSTER, () => { this.onJoinInRoster(socket); });
            } else {
                client.isPediatrician = false;
                client.room = randomString.generate();

                socket.unique(Events.SEARCHING_EVENT, (data) => { this.onSearching(socket, data); });
            }

            //socket.removeAllListeners(this.AUTH_EVENT, (data) => { onAuth(socket, data); });

            socket.hgclient = client;

            if (this._io.adapter.clientsMap.has(client.user.id)) {
                //this.softDisconnect(socket);
                //throw new HGError('Try To Make Multiple Connections');
                this.restore(this._io.adapter.clientsMap.get(client.user.id), socket);
                this._io.adapter.clientsMap.set(client.user.id, socket);
                return;
            }

            this._io.adapter.clientsMap.set(client.user.id,  socket);

            this.info('Sending Auth Event To Client', socket);
            socket.emit(this.AUTH_EVENT);

            //this.dumpClientsMapKeys();

            this.info('Chat Client Goes Online');
        });
    }

    onJoinInRoster(socket) {
        this.info('Doctor Try Join Roster', socket);
        //this.dumpClientsMapKeys();
        let client = socket.hgclient;

        if (_.isNil(client) || !client.isPediatrician) {
            return;
        }

        if (!_.isNil(client.workingWithSocket)) {
            throw new HGError("Can't Join Pending Room While Working With Client");
        }

        HGApi.checkDoctor(client.user, (data) => {
            if (data != 'true') {
                throw new HGError('This Doctor Can\'t Join Pending Room');
            }

            socket.join(Events.PENDING_PEDIATRICIANS_ROOM);

            //socket.unique(this.NEW_REQUEST_EVENT, (data) => { onChatRequestHandler(socket, data); });
            socket.unique(Events.LEAVE, () => { this.onLeave(socket); });
            socket.unique(Events.ACCEPT_REQUEST_EVENT, (data) => { this.onAcceptRequest(socket, data); });
            socket.unique(Events.DECLINE_REQUEST_EVENT, (data) => { this.onDeclineRequest(socket); });

            socket.removeAllListeners(Events.JOIN_IN_DOCTORS_ROSTER, () => { this.onJoinInRoster(socket); });

            socket.emit(Events.DOCTOR_CHECK_SUCCESS);

            socket.hgclient.status = Statuses.PENDING;

            this.info('Doctor Pending...', socket);

            let iterator = this._io.adapter.clientsMap.keys();

            for (let key of iterator) {
                let s = this._io.adapter.clientsMap.get(key);

                if (socket.hgclient.user.id == s.hgclient.user.id
                    || s.hgclient.status != Statuses.SEARCHING
                    || s.hgclient.isPediatrician) {
                    continue;
                }

                let response = new HGRequest();
                response.add('id', s.hgclient.user.id);
                response.clear();

                socket.emit(Events.NEW_REQUEST_EVENT, response);

                break;
            }
        });
    }

    onLeave(socket) {
        //socket.removeAllListeners(this.NEW_REQUEST_EVENT, (data) => { onChatRequestHandler(socket, data); });
        socket.removeAllListeners(Events.LEAVE, () => { this.onLeave(socket); });

        socket.hgclient.workingWithSocket = null;

        socket.leave(Events.PENDING_PEDIATRICIANS_ROOM, () => {
            socket.unique(Events.JOIN_IN_DOCTORS_ROSTER, () => { this.onJoinInRoster(socket); });

            socket.emit(Events.LEAVE_SUCCESS);

            if (socket.hgclient.status == Statuses.PENDING) {
                socket.hgclient.status = Statuses.AUTHORIZED;
            }

            this.info('Doctor Leave Pending Room', socket);
        });
    }

    onSearching(socket, data) {
        this.info('Client Start Searching', socket);

        //this.dumpClientsMapKeys();

        let client = socket.hgclient;

        client.acceptedDoctors = 0;

        this.info('Try To Send new-request...', socket);

        let response = new HGRequest();
        response.add('id', client.user.id);
        response.clear();

        //console.log(response);

        this._io.to(Events.PENDING_PEDIATRICIANS_ROOM).emit(Events.NEW_REQUEST_EVENT, response);

        socket.unique(Events.ON_SEARCH_END_EVENT, (data) => { this.onSearchEnd(socket, data); });

        socket.hgclient.status = Statuses.SEARCHING;
        //socket.unique(this.ACCEPT_REQUEST_EVENT, (data) => { onAcceptRequestEvent(socket, data); });
    }

    onSearchEnd(socket, data) {
        this.info('Client Stop Searching', socket);
        //this.dumpClientsMapKeys();

        data = HGRequest.fromString(data);

        let client = socket.hgclient;

        data.validate(null, client.user);

        //socket.removeAllListeners(this.ACCEPT_REQUEST_EVENT, (data) => { onAcceptRequestEvent(socket, data); });
        socket.removeAllListeners(Events.ON_SEARCH_END_EVENT, (data) => { this.onSearchEnd(socket, data); });

        let response = new HGRequest();
        response.add('id', client.user.id);
        response.clear();

        socket.hgclient.status = Statuses.CHOOSING;

        let doctorsResponse = new HGRequest();
        doctorsResponse.add('doctors', _.map(client.currentAcceptedDoctors, (d) => { return d.hgclient.user.id }));
        doctorsResponse.add('user_id', client.user.id);
        doctorsResponse.clear();

        for (let d of client.currentAcceptedDoctors) {
            d.emit(Events.CLIENT_END_SEARCHING, doctorsResponse);
        }

        this._io.to(Events.PENDING_PEDIATRICIANS_ROOM).emit(Events.CLIENT_END_SEARCHING, response);
    }

    onAcceptRequest(socket, data) {
        this.info('Doctor Try Accept Clients Request', socket);
        this.debug(data);
        this.debug(socket.hgclient.user.id);
        //this.dumpClientsMapKeys();

        //console.log(data);

        this.info('before getting doctor socket');

        let doctor = socket.hgclient;

        data = CustomIdRequest.fromString(data, false);

        if (!data.validate(['id'])) {
            throw new HGError('User Id Not Found', socket);
        }

        if (!doctor.user.validate()) {
            throw new HGError('User Validation Failed', socket);
        }

        try {
            let [clientSocket, client] = this.getClientById(data.id);
        } catch (e){
            throw new HGError('Client Stop Searching, You Are Late', socket);
        }

        if (client.status != Statuses.SEARCHING) {
            throw new HGError('Client Stop Searching, You Are Late', socket);
        }

        for (let one of client.currentAcceptedDoctors) {
            if (one == socket) {
                throw new HGError('You Are Already Accept This Request', socket);
            }
        }

        if (client.acceptedDoctors >= 3) {
            throw new HGError('Client Already Find 3 Doctors', socket);
        }

        client.acceptedDoctors++;

        client.currentAcceptedDoctors.add(socket);

        doctor.workingWithSocket = clientSocket;

        doctor.status = Statuses.FOUNDED;

        let response = new HGRequest();
        response.add('id', doctor.user.id);
        response.clear();

        //console.log(response);

        clientSocket.emit(Events.REQUEST_ACCEPTED_EVENT, response);

        socket.leave(Events.PENDING_PEDIATRICIANS_ROOM, () => {
            socket.unique(Events.JOIN_IN_DOCTORS_ROSTER, () => { this.onJoinInRoster(socket); });

            this.info('Doctor Leave Pending Room', socket);
        });

        socket.emit(Events.REQUEST_ACCEPTED_EVENT, _.map(client.currentAcceptedDoctors, (d) => {
            return d.hgclient.user.id;
        }));

        //socket.unique(this.ON_DOCTOR_CHOOSE, (data) => { onDoctorChoose(socket, data); });
        clientSocket.unique(Events.ON_DOCTOR_CHOOSE, (data) => { this.onDoctorChoose(clientSocket, data); });

        for (let d of client.currentAcceptedDoctors.values()) {
            if (d != socket) {
                this.info('Emitting Accepted Doctor To Others', d);
                d.emit(Events.REQUEST_ACCEPTED_EVENT, response);
            }
        }
    }

    onDeclineRequest(socket) {
        this.info('Doctor Try To Decline Request', socket);

        HGApi.incrementFailed(socket.hgclient.user, (response) => {
            this.debug(response, socket);
        });
    }

    onDoctorChoose(socket, data) {
        this.info('On Doctor Choose Call', socket);
        //this.dumpClientsMapKeys();
        let client = socket.hgclient;

        //console.log(JSON.stringify(client));

        if (client.isPediatrician) {
            this.error('On Doctor Choose Called By Doctor, Returning', socket);
            return;
        }

        //console.log(data);

        data = CustomIdRequest.fromString(data, false);

        if (!data.validate(['id'])) {
            throw new HGError('Doctor Id Not Found');
        }

        let [doctorSocket, doctor] = this.getClientById(data.id);

        this.info('Emitting Choose Event To Doctor', doctorSocket);

        client.participantSocket = doctorSocket;
        doctor.participantSocket = socket;

        let chosenResponse = new HGRequest();
        chosenResponse.add('id', client.user.id);
        chosenResponse.clear();

        doctorSocket.emit(Events.ON_DOCTOR_CHOOSE, chosenResponse);

        socket.unique(Events.ON_PAYMENT_EVENT, () => { this.onPaymentInProgress(socket); });

        let response = new HGRequest();
        response.add('doctor_id', doctor.user.id);
        response.add('user_id', client.user.id);
        response.clear();

        doctor.status = Statuses.CHOSEN;

        for (let d of client.currentAcceptedDoctors.values()) {
            this.debug('OnSkipCycle: ' + d.hgclient.user.id, d);
            if (d != doctorSocket) {
                d.hgclient.workingWithSocket = null;
                this.info('Emitting Skip Event To Doctor: ' + d.hgclient.user.id, d);
                d.emit(Events.ON_DOCTOR_SKIP, response);

                if (d.hgclient.status ==  Statuses.FOUNDED) {
                    d.hgclient.status = Statuses.PENDING;

                    d.hgclient.workingWithSocket = null;

                    this.onJoinInRoster(d);
                }
            }
        }
    }

    payment(socket, timeout = null) {
        this.info('Payment Call', socket);
        this.info('DisconnectionTimeout Clear', socket);
        clearTimeout(timeout);

        socket.hgclient.participantSocket.removeAllListeners(Events.ARE_YOU_HERE, () => { this.payment(socket, timeout); });

        this.info('Try To Emit Payment Event To Doctor', socket.hgclient.participantSocket);
        socket.hgclient.participantSocket.emit(Events.PAYMENT_EVENT);

        socket.removeAllListeners(Events.ON_PAYMENT_EVENT, () => { this.onPaymentInProgress(socket); });

        socket.unique(Events.ON_READY_TO_CHAT, () => { this.onReadyToChat(socket); });

        socket.hgclient.status = Statuses.PAYMENT;
        socket.hgclient.participantSocket.hgclient.status = Statuses.WAITING_PAYMENT;
    }

    onPaymentInProgress(socket) {
        this.info('Client Start Payment', socket);
        //this.dumpClientsMapKeys();

        if (_.isNil(socket.hgclient.participantSocket)) {
            throw new HGError('Participant Lost :(((');
        }

        const isNotHereTimeout = setTimeout(() => {
            this.error('Client Is Not here: Disconnect');
            socket.hgclient.participantSocket.disconnect();
        }, 3000);

        this.info("Ask 'Are You Here'", socket.hgclient.participantSocket);
        socket.hgclient.participantSocket.unique(Events.ARE_YOU_HERE, () => { this.payment(socket, isNotHereTimeout); });

        socket.hgclient.participantSocket.emit(Events.ARE_YOU_HERE, {});
    }

    onReadyToChat(socket, data) {
        this.info('Client Ready To Chat', socket);
        //this.dumpClientsMapKeys();

        HGApi.createChat(
            socket.hgclient.user,
            `${socket.hgclient.user.id},${socket.hgclient.participantSocket.hgclient.user.id}`,
            this.PRIVATE_DOCTOR_CHAT_TYPE,
            (chat) => {
                let doctorSocket = socket.hgclient.participantSocket;

                this.debug(chat);

                chat = JSON.parse(chat);

                this.debug(chat, socket);

                if (chat.id == undefined) {
                    throw new HGError("Chat Not Created", socket);
                }

                this.info('Chat Created');

                let response = new HGRequest();
                response.add('id', chat.id);
                response.clear();

                this.info('Try To Attach Chat Message Listener To Participants', socket);
                this.info('Try To Attach Chat Message Listener To Participants', doctorSocket);
                socket.unique(Events.ON_CHAT_MESSAGE, (data) => { this.onChatMessage(socket, data); });
                doctorSocket.unique(Events.ON_CHAT_MESSAGE, (data) => { this.onChatMessage(doctorSocket, data); });

                this.info("Try To Emit Chat Started", socket);
                this.info("Try To Emit Chat Started", doctorSocket);
                socket.emit(Events.CHAT_STARTED, response);
                doctorSocket.emit(Events.CHAT_STARTED, response);

                socket.hgclient.status = Statuses.IN_CHAT;
                doctorSocket.hgclient.status = Statuses.IN_CHAT;

                socket.hgclient.chatId = chat.id;
                doctorSocket.hgclient.chatId = chat.id;

                HGApi.incrementConducted(doctorSocket.hgclient.user, chat.id,  (response) => {
                   this.debug(JSON.parse(response), doctorSocket);
                   this.debug(response, doctorSocket);
                });
            });
    }

    onChatMessage(socket, data) {
        this.info('On Chat Message Call', socket);
        //this.dumpClientsMapKeys();

        this.debug(data, socket);

        data = HGChatMessage.fromString(data);

        if (_.isNil(socket.hgclient)) {
            throw new HGError('Client Not Authorized');
        }

        //this.debug(data);

        if (!data.validate(HGChatMessage.partialValidationFields)) {
            throw new HGError('Chat Message Invalid');
        }

        HGApi.addMessageToChat(socket.hgclient.user, data.chatId, data.message, (response) => {
            //this.debug(response);

            let participantSocket = socket.hgclient.participantSocket;

            this.info('Try To Emit Chat Message', socket);
            this.info('Try To Emit Chat Message', participantSocket);
            socket.emit(Events.ON_CHAT_MESSAGE, JSON.parse(response));
            participantSocket.emit(Events.ON_CHAT_MESSAGE, JSON.parse(response));
        });
    }

    restore(oldSocket, newSocket) {
        this.info('Restore Call');

        this.debug(oldSocket.hgclient.status, oldSocket);
        this.debug(JSON.stringify(this.restoreHandlers.keys()));

        if (this.restoreHandlers.has(oldSocket.hgclient.status)) {
            this.info('Restore Execute', newSocket);

            newSocket.hgclient = oldSocket.hgclient;

            let response = this.restoreHandlers.get(oldSocket.hgclient.status)(newSocket, this);

            this.softDisconnect(oldSocket);

            response.status = newSocket.hgclient.status;

            console.log(response);

            this._io.adapter.clientsMap.set(newSocket.hgclient.user.id, newSocket);

            newSocket.emit(Events.RESTORE, JSON.stringify(response));
        }
    }

    restoreAuthorized(newSocket, context) {
        if (newSocket.hgclient.isPediatrician) {
            newSocket.hgclient.workingWithSocket = null;

            newSocket.unique(Events.JOIN_IN_DOCTORS_ROSTER, () => { context.onJoinInRoster(newSocket); });
        } else {
            newSocket.unique(Events.SEARCHING_EVENT, (data) => { context.onSearching(newSocket, data); });
        }

        return {};
    }

    restorePending(newSocket, context) {
        newSocket.hgclient.workingWithSocket = null;

        newSocket.join(Events.PENDING_PEDIATRICIANS_ROOM);
        newSocket.unique(Events.LEAVE, () => { context.onLeave(newSocket); });
        newSocket.unique(Events.ACCEPT_REQUEST_EVENT, (data) => { context.onAcceptRequest(newSocket, data); });

        return {};
    }

    restoreFounded(newSocket, context) {
        _.replace(newSocket.hgclient.workingWithSocket.hgclient.currentAcceptedDoctors, (c) => {
            return c.id == newSocket.id;
        });

        newSocket.hgclient.workingWithSocket.hgclient.currentAcceptedDoctors.add(newSocket);

        newSocket.unique(Events.JOIN_IN_DOCTORS_ROSTER, () => { context.onJoinInRoster(newSocket); });

        return {
            workingWith: newSocket.hgclient.workingWithSocket.hgclient.user.id
        };
    }

    restoreChosen(newSocket, context) {
        newSocket.hgclient.updateParticipantSocket(newSocket);

        return {
            workingWith: newSocket.hgclient.workingWithSocket.hgclient.user.id
        };
    }

    restoreWaitingPayment(newSocket, context) {
        return {
            workingWith: newSocket.hgclient.workingWithSocket.hgclient.user.id
        };
    }

    restoreSearching(newSocket, context) {
        if (newSocket.hgclient.acceptedDoctors < 3) {
            let data = new HGRequest();
            data.add('id', newSocket.hgclient.user.id);
            data.clear();

            context._io.to(Events.PENDING_PEDIATRICIANS_ROOM).emit(Events.NEW_REQUEST_EVENT, data);
        }

        newSocket.unique(Events.ON_SEARCH_END_EVENT, (data) => { context.onSearchEnd(newSocket, data); });

        let doctors = [];

        for (let d of newSocket.hgclient.currentAcceptedDoctors) {
            doctors.push(d.hgclient.user.id);
        }

        return {
            doctors: doctors
        };
    }

    restoreChoosing(newSocket, context) {
        let doctors = [];

        for (let d of newSocket.hgclient.currentAcceptedDoctors) {
            doctors.push(d.hgclient.user.id);
        }

        return {
            doctors: doctors
        };
    }

    restorePayment(newSocket, context) {
        newSocket.unique(Events.ON_READY_TO_CHAT, () => { context.onReadyToChat(newSocket); });

        return {
            participant: newSocket.hgclient.participantSocket.hgclient.user.id
        };
    }

    restoreInChat(newSocket, context) {
        newSocket.unique(Events.ON_CHAT_MESSAGE, (data) => { context.onChatMessage(newSocket, data); });
        newSocket.hgclient.updateParticipantSocket(newSocket);

        return {
            participant: newSocket.hgclient.participantSocket.hgclient.user.id,
            chatId: newSocket.hgclient.chatId
        };
    }
}

module.exports = HGDoctorChat;