/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * KeyAPI was originally using this file. While it's deprecated now, we still
 * have some setups using it.
 */

var util = require('util');

var Validator = require('../lib/schema/validator');



///--- API

function KeyAPIPrivKey() {
    Validator.call(this, {
        name: 'keyapiprivkey',
        required: {
            uuid: 1,
            key: 1,
            timestamp: 1
        },
        strict: true
    });
}
util.inherits(KeyAPIPrivKey, Validator);



///--- Exports

module.exports = {
    createInstance: function createInstance() {
        return new KeyAPIPrivKey();
    }
};
