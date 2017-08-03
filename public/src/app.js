/**
 * Created by JimmDiGriz on 08.06.2017.
 */

'use strict';

import Vue from 'vue';
import VueSocketIO from 'vue-socket.io';
import Events from './values/events';

Vue.use(VueSocketIO, window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/doctor-chat');

const app = new Vue({
    el: '#app',
    data: {
        messages: [],
        command: '',
    },
    created: function() {

    },
    updated: function() {
        document.getElementById('bottom').scrollIntoView();
    },
    sockets: {
        connect: function() {
            console.log('Socket Connected');
            this.login();
        },
        'console-login': function() {
            console.log('Login Successful');
        },
        'output-message': function(data) {
            console.log('NewMessage Call');
            this.messages.push(JSON.parse(data));

            //document.getElementById('bottom').scrollIntoView();
        }
    },
    methods: {
        login: function() {
            console.log('Login Call');
            this.$socket.emit(Events.CONSOLE_LOGIN, JSON.stringify({authKey: 'test'}));
        },
        send: function() {
            console.log('Send Call');
            this.$socket.emit(Events.INPUT, JSON.stringify({command: this.command}));

            this.command = '';
        },
        getOutputMessage: function(message) {
            return message.level + ': ' + (message.message+'').replace(/\n/g, "<br>");
        }
    }
});