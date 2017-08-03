/**
 * Created by JimmDiGriz on 31.01.2017.
 */

'use strict';

module.exports = {
    'port': 8124,
    'io': {
        'origins': '*:*',
        'transports': ['websocket', 'polling', 'xhr-polling'],
        'heartbeat timeout': 60000,
        'heartbeat interval': 5000
    },
    'redis': {
        'host': 'localhost',
        'port': 6379
    },
    'api': {
        'host': 'giraffe.code-geek.ru',
        'version': 'v2_1'
    }
};
