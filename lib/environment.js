'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * This task sets and checks for ENV variables which the application cares about.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function environment(next) {
    if (!process.env.SECRET) {
        // SECRET is used for cookies and sessions. Make sure to choose something password-y.
        logger.warn('No $SECRET present. Generating a temporary random value.');
        process.env.SECRET = require('crypto').randomBytes(256);
    }
    else
    {
      logger.success('SECRET provided: ' + process.env.SECRET);
    }
    if (!process.env.PORT) {
        // PORT is what the application listens on.
        logger.warn('No $PORT present. Choosing a sane default, 8081.');
        process.env.PORT = 8081;
    }
    else
    {
      logger.success('PORT provided: ' + process.env.PORT);
    }
    if (!process.env.HUBAPI_URL) {
        // The address of the hubapi.
        logger.warn('No HUBAPI_URL present. Defaulting to `https://hubapi:8080`.');
        process.env.HUBAPI_URL = 'https://hubapi:8080';
    }
    else
    {
      logger.success('HUBAPI_URL provided: ' + process.env.HUBAPI_URL);
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
        // Allow node to accept self-signed certificates. Used in development. Should not be needed in production.
        logger.warn('The application is set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    return next(null);
}

// This task has no dependencies.
module.exports = environment;
