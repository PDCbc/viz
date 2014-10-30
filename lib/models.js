'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function models(next, data) {
    return next(null);
}

module.exports = [ 'database', models ];
