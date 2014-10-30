'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function middleware(next, data) {
    function providerRequest(req, path, callback) {
        require('request').get({ url: process.env.PROVIDER_URL + path, json: true }, function (error, request, body) {
            callback(error, request);
        });
        // Callback should be (error, request)
    }
    function populateVisualizationList(req, res, callback) {
        // TODO: Cache this per user.
        providerRequest(req, '/api', function validation(error, request) {
            if (error) { return next(error); }
            var validated = data.validators.list(request.body);
            console.log(validated.valid);
            if (validated.valid === true) {
                req.visualizations = request.body.visualizations;
                callback();
            } else {
                callback(new Error(JSON.stringify(validated, 2)));
            }
        });
    }
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

module.exports = middleware;
