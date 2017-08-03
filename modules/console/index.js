/**
 * Created by JimmDiGriz on 07.06.2017.
 */

'use strict';

const RL = require('readline');
const HGError = require('../../models/HGError');

class Console {
    constructor() {
        this.handlers = new Map();

        this.readline = RL.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.readline.on('line', (input) => {
            input = input.split(' ');

            const command = input.shift();
            const args = input;

            if (!this.handlers.has(command)) {
                //console.error('UnknownCommand');
                throw new HGError('UnknownCommand');

                //return;
            }

            this.handlers.get(command).handler(args);
        });
    }

    /**
     * @param {String} command
     * @param {Function} handler
     * @param {String} description
     **/
    on(command, handler, description = 'No Description') {
        this.handlers.set(command, {handler: handler, description: description});
    }

    execute(command) {
        this.readline.write(command);
        this.readline.write(null, {name: 'enter'});
    }

    list() {
        let result = "\n\n";

        for (let key of this.handlers.keys()) {
            result += "\n" + key + ' ---> ' + this.handlers.get(key).description;
        }

        result += "\n\n";

        return result;
    }
}

module.exports = Console;