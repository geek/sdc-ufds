// Copyright 2012 Joyent, Inc.  All rights reserved.

var assert = require('assert');

var ldap = require('ldapjs');


///--- Globals

var parseDN = ldap.parseDN;


///--- Functions

function ISODateString(d) {
    function pad(n) {
        return n < 10 ? '0' + n : n;
    }

    if (!d)
        d = new Date();

    return d.getUTCFullYear() + '-' +
        pad(d.getUTCMonth() + 1) + '-' +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) + ':' +
        pad(d.getUTCMinutes()) + ':' +
        pad(d.getUTCSeconds()) + 'Z';
}


function operationsError(err) {
    var msg = err && err.message ? err.message : '';
    return new ldap.OperationsError('Moray failure: ' + msg,
                                    null, operationsError);
}


function _error(req, err) {
    switch (err.statusCode) {
    case 404:
        return new ldap.NoSuchObjectError(req.dn.toString());
    default:
        return operationsError(err);
    }
}


function _exists(req) {
    return function exists(bucket, key, callback) {
        var client = req.moray;
        var log = req.log;
        var opts = { requestId: req.req_id };

        log.debug({bucket: bucket, key: key}, 'exists entered');
        return client.get(bucket, key, opts, function (err, meta, _) {
            if (err && err.statusCode !== 404)
                return callback(operationsError(err));

            var e = err && err.statusCode === 404 ? false : true;
            log.debug({bucket: bucket, key: key, exists: e}, 'exists done');
            return callback(null, e);
        });
    };
}


function _get(req) {
    return function get(bucket, key, callback) {
        var client = req.moray;
        var log = req.log;
        var opts = { requestId: req.req_id };

        log.debug({bucket: bucket, key: key}, 'get entered');
        return client.get(bucket, key, opts, function (err, meta, val) {
            if (err)
                return callback(_error(req, err));

            log.debug({bucket: bucket, key: key, val: val}, 'get done');
            return callback(null, val, meta);
        });
    };
}


function _put(req) {
    return function put(bucket, key, value, meta, callback) {
        if (typeof (meta) === 'function') {
            callback = meta;
            meta = {};
        }

        var client = req.moray;
        var log = req.log;
        var opts = {
            match: meta.etag,
            requestId: req.req_id,
            headers: meta.headers || {}
        };

        opts.headers['x-ufds-changelog-bucket'] = req.config.changelog.bucket;

        log.debug({bucket: bucket, key: key, opts: opts}, 'put entered');
        return client.put(bucket, key, value, opts, function (err) {
            if (err)
                return callback(_error(req, err));

            log.debug({bucket: bucket, key: key, val: value}, 'put done');
            return callback(null);
        });
    };
}


function _del(req) {
    return function del(bucket, key, meta, callback) {
        if (typeof (meta) === 'function') {
            callback = meta;
            meta = {};
        }

        var client = req.moray;
        var log = req.log;
        var opts = {
            match: meta.etag,
            requestId: req.req_id,
            headers: meta.headers || {}
        };

        opts.headers['x-ufds-changelog-bucket'] = req.config.changelog.bucket;

        log.debug({bucket: bucket, key: key, opts: opts}, 'del entered');
        return client.del(bucket, key, opts, function (err) {
            if (err)
                return _error(req, err);

            log.debug({bucket: bucket, key: key}, 'del done');
            return callback(null);
        });
    };
}


function _search(req) {
    return function search(bucket, filter, callback) {
        var client = req.moray;
        var log = req.log;
        var opts = { requestId: req.req_id };

        log.debug({bucket: bucket, filter: filter}, 'search entered');
        return client.search(bucket, filter, opts, function (err, results) {
            if (err)
                return callback(_error(req, err));

            log.debug({
                bucket: bucket,
                filter: filter,
                results: results
            }, 'search done');

            return callback(null, results);
        });
    };
}


///--- Exports

module.exports = {

    operationsError: operationsError,

    setup: function commonSetup(req, res, next) {
        req.key = req.dn.toString();

        req.exists = _exists(req);
        req.put = _put(req);
        req.get = _get(req);
        req.del = _del(req);
        req.search = _search(req);

        return next();
    }
};