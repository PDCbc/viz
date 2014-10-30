'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Setup the SSL Certificates.
 * @param {Function} next - The callback.
 */
function certificate(next) {
    var fs = require('fs');
    // Get the certificates.
    async.auto({
        key:  function (callback) { fs.readFile('cert/server.key', 'utf8', callback); },
        cert: function (callback) { fs.readFile('cert/server.crt', 'utf8', callback); }
    }, function (error, results) {
        if (error) { generateCertificate(error, results, next); }
        else { return next(error, results); }
    });

    /**
     * Detects if certs are missing and generates one if needed
     * @param {Error|null}    error     - If `error` is non-null, generate a certificate, since one doesn't exist.
     * @param {Object|null} results - Passed to `next`.
     * @param {Function}        next        - The callback. Is passed `error` (if not a certificate error) and `results`.
     */
    function generateCertificate(error, results, callback) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Tell Node it's okay.
        if (error && error.code === 'ENOENT') {
            logger.warn('No certificates present in `cert/{server.key, server.crt}`. Generating a temporary certificate.');
            require('pem').createCertificate({ days: 1, selfSigned: true }, function formatKey(error, keys) {
                if (error) { return next(error, null); }
                return callback(null, {key: keys.serviceKey, cert: keys.certificate });
            });
        } else {
            return callback(error, results);
        }
    }
}

module.exports = [ 'environment', certificate ];
