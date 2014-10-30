'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function environment(next) {
    if (!process.env.SECRET) {
        logger.warn('No $SECRET present. Generating a temporary random value.');
        process.env.SECRET = require('crypto').randomBytes(256);
    }
    if (!process.env.PORT) {
        logger.warn('No $PORT present. Choosing a sane default, 8081.');
        process.env.PORT = 8081;
    }
    if (!process.env.MONGO_URI) {
        logger.warn('No $MONGO_URI present. Defaulting to `mongodb://localhost/vis`.');
        process.env.MONGO_URI = 'mongodb://localhost/vis';
    }
    if (!process.env.PROVIDER_URL) {
        logger.warn('No PROVIDER_URL present. Defaulting to `https://localhost:8080`.');
        process.env.PROVIDER_URL = 'https://localhost:8080';
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== 0) {
        logger.warn('The application set set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    return next(null);
}

module.exports = environment;
