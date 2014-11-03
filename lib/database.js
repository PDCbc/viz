'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * This task sets up MongoDB and will not invoke next until it has either connected or errored.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `environment
 */
function database(next, data) {
    var connection = require('mongoose').connect(process.env.MONGO_URI).connection;
    // This is an event handler.
    // The mongoose library emits events (open or error) when it connects (or fails to)
    connection.on('open', function () {
        logger.log('Connected to database on ' + process.env.MONGO_URI);
        return next(null);
    });
    connection.on('error', function (error) {
        logger.error("Could not connect to database. Did you start it, is the URL right?");
        return next(error, connection);
    });
}

// This module depends on the `environment` task.
module.exports = [ 'environment', database ];
