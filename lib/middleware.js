'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Middleware for requests to the provider.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `validators`
 */
function middleware(next, data) {
    /**
     * Make a request to the provider.
     * @param {Object}   req      The express `req` object.
     * @param {String}   path     The desired URI on the provider.
     * @param {Function} callback The callback of the function. Signature (error, request)
     */
    function providerRequest(req, path, callback) {
        require('request').get({ url: process.env.PROVIDER_URL + path, json: true }, function (error, request, body) {
            callback(error, request);
        });
        // Callback should be (error, request)
    }
    /**
     * Makes a request to the provider API for a list of visualizations and attaches it to `req.visualizations`.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualizationList(req, res, callback) {
        // TODO: Cache this per user.
        providerRequest(req, '/api', function validation(error, request) {
            if (error) { return callback(error); }
            var validated = data.validators.list(request.body);
            // console.log(validated.valid);
            if (validated.valid === true) {
                req.visualizations = request.body.visualizations;
                callback();
            } else {
                callback(new Error(JSON.stringify(validated, 2)));
            }
        });
    }
    /**
     * Makes a request to the provider API for a single visualization and attaches it to `req.visualization`.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualization(req, res, callback) {
        if (!req.params.title) { return res.redirect('/'); }
        providerRequest(req, '/api/' + req.params.title, function validation(error, request) {
            if (error) { return next(error); }
            var validated = data.validators.item(request.body);
            if (validated.valid === true) {
                req.visualization = request.body;
                callback();
            } else {
                callback(new Error(JSON.stringify(validated, 2)));
            }
        });
    }
    return next(null, {
        populateVisualizationList: populateVisualizationList,
        populateVisualization: populateVisualization,
        providerRequest: providerRequest
    });
}

// This task depends on the `validators` task.
module.exports = ['validators', middleware];
