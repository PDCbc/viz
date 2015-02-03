'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Sets up the database models for this application. (None yet!)
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `database` task.
 */
function models(next, data) {
    logger.warn('models');
    return next(null);
}

// This task depends on `database` task.
module.exports = [ 'database', models ];
