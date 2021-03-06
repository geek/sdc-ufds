/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var ldap = require('ldapjs');

function logFailedLoginAttempt(req) {
    var changes = [];
    var now = Date.now();

    if (!req._entry.pwdfailuretime ||
            req._entry.pwdfailuretime.length === 0) {
        changes.push(now);
        req.changes.push(new ldap.Change({
            operation: 'add',
            modification: new ldap.Attribute({
                type: 'pwdfailuretime',
                vals: changes
            })
        }));
    } else {
        changes = changes.concat(req._entry.pwdfailuretime.sort(
                    function (s, t) {
                        // Reverse sort based on timestamp:
                        if (s < t) {
                            return 1;
                        }
                        if (s > t) {
                            return -1;
                        }
                        return 0;
                    })).slice(0, req._policy.pwdmaxfailure - 1);

        changes.push(now);

        req.changes.push(new ldap.Change({
            operation: 'replace',
            modification: new ldap.Attribute({
                type: 'pwdfailuretime',
                vals: changes
            })
        }));
    }

    if (changes.length === parseInt(req._policy.pwdmaxfailure[0], 10)) {
        var op = (!req._entry.pwdaccountlockedtime ||
            req._entry.pwdaccountlockedtime.length === 0) ? 'add' : 'replace';
        req.changes.push(new ldap.Change({
            operation: op,
            modification: new ldap.Attribute({
                type: 'pwdaccountlockedtime',
                vals: [now + (req._policy.pwdlockoutduration * 1000)]
            })
        }));
    }

}


function removeFailedLoginAttempts(req) {
    req.changes.push(new ldap.Change({
        operation: 'delete',
        modification: new ldap.Attribute({
            type: 'pwdfailuretime',
            vals: []
        })
    }));

    if (req._entry.pwdaccountlockedtime &&
        req._entry.pwdaccountlockedtime.length !== 0) {
        req.changes.push(new ldap.Change({
            operation: 'delete',
            modification: new ldap.Attribute({
                type: 'pwdaccountlockedtime',
                vals: []
            })
        }));
    }
}

module.exports = {
    logFailedLoginAttempt: logFailedLoginAttempt,
    removeFailedLoginAttempts: removeFailedLoginAttempts
};
