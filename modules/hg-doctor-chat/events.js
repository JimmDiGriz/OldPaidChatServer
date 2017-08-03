/**
 * Created by JimmDiGriz on 05.04.2017.
 */

'user strict';

module.exports = {
    /**pending*/
    JOIN_IN_DOCTORS_ROSTER: 'doctors-roster',
    LEAVE: 'leave',
    DOCTOR_CHECK_SUCCESS: 'doctor-check-success',
    LEAVE_SUCCESS: 'leave-success',

    PENDING_PEDIATRICIANS_ROOM: 'pending-pediatricians',

    /**searching*/
    SEARCHING_EVENT: 'searching-doctor',
    NEW_REQUEST_EVENT: 'new-request',
    CLIENT_END_SEARCHING: 'client-end-searching',
    ACCEPT_REQUEST_EVENT: 'accept-request',
    DECLINE_REQUEST_EVENT: 'decline-request',
    REQUEST_ACCEPTED_EVENT: 'request-accepted',
    ON_SEARCH_END_EVENT: 'search-end',

    /**doctors choose*/
    ON_DOCTOR_CHOOSE: 'on-doctor-choose',
    ON_DOCTOR_SKIP: 'on-doctor-skip',

    /**payment*/
    ON_PAYMENT_EVENT: 'on-payment-in-progress',
    PAYMENT_EVENT: 'payment-in-progress',
    ON_READY_TO_CHAT: 'on-ready-to-chat',

    /**chat*/
    CHAT_STARTED: 'chat-started',
    ON_CHAT_MESSAGE: 'on-chat-message',

    /**lost*/
    PARTICIPANT_LOST: 'participant-lost',
    DOCTOR_LOST: 'doctor-lost',
    CLIENT_LOST: 'client-lost',

    RESTORE: 'restore',

    ARE_YOU_HERE: 'are-you-here'
};