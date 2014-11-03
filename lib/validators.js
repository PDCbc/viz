'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Sets up schema validators for the type of data we'll accept.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function validators(next) {
    var tv4 = require('tv4'), // Node module: https://github.com/geraintluff/tv4
        fs = require('fs');
    /**
     * Creates validator functions for input.
     * @param {String}     file         - The file path.
     * @param {Function} callback - The callback.
     */
    function validatorFactory(filePath, callback) {
        fs.readFile(filePath, 'utf8', function (err, file) {
            if (err) { callback(err, null); }
            /**
             * Validates the data based on the schema.
             * @param    {Object} data - The data to validate.
             * @return {Boolean}         - If it's valid.
             */
            function validate(data) {
                return tv4.validateResult(data, JSON.parse(file));
            }
            return callback(null, validate);
        });
    }
    async.parallel({
        // callbacks are implictly here
        item: _.partial(validatorFactory, './schema/item.json'),
        list: _.partial(validatorFactory, './schema/list.json')
    }, function finish(error, results) {
            next(error, results);
            // Results is [function validateItem(data), function validateList(data)]
    });
}

// This task has no dependencies.
module.exports = validators;
