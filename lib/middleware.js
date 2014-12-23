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
     * Make a GET request to the provider.
     * @param {Object}   req      The express `req` object.
     * @param {String}   path     The desired URI on the provider.
     * @param {Function} callback The callback of the function. Signature (error, request)
     */
    function providerGet(req, path, callback) {
        require('request').get({ url: process.env.PROVIDER_URL + path, json: true }, function (error, request, body) {
            callback(error, request);
        });
        // Callback should be (error, request)
    }
    /**
     * Make a POST request to the provider.
     * @param {Object}   req      The express `req` object.
     * @param {String}   path     The desired URI on the provider.
     * @param {Object}   data     The data to send.
     * @param {Function} callback The callback of the function. Signature (error, request)
     */
    function providerPost(req, path, data, callback) {
        require('request').post({ url: process.env.PROVIDER_URL + path, json: true, form: data }, function (error, request, body) {
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
        providerGet(req, '/api/queries', function validation(error, request) {
            if (error) { return callback(error); }
            req.queries = request.body.queries;
            callback();
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
        // TODO: Don't use a static.
        providerGet(req, '/api/processed_result/' + req.params.title + '/5488cffb4fe634d125000002/00001', function validation(error, request) {
            if (error) { return next(error); }
            req.visualization = request.body;
            callback();
        });
    }
    /**
     * Attempts to authenticate the user with the provider.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function authenticateUser(req, res, callback) {
        if (!req.body.user && !req.body.password) {
            req.session.message = "Please provide a username and password in the request body.";
            res.status(401).redirect('/auth');
        } else {
            providerPost(req, '/auth', {username: req.body.username, password: req.body.password}, function result(error, response) {
                if (response.statusCode === 200) {
                    req.session.user = response.body;
                    callback();
                } else {
                    req.session.message = response.body.error;
                    res.status(401).redirect('/auth');
                }
            });
        }
    }
    /**
     * Checks the authentication of the user. (Does not talk to the provider)
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function checkAuthentication(req, res, callback) {
        if (req.session && req.session.user) {
            callback(null);
        } else {
            // TODO: Cache URL that was requested and restore it.
            req.session.message = "No User found... Please log in.";
            res.status(401).redirect('/auth');
            callback(new Error('User not authenticated.'));
        }
    }

    /**
     * Checks to see if the user has the given role. TODO: Variable arguements.
     * @param {String} role The role to check for.
     * @return {Function}
     */
    function hasRole(role) {
        // Note this uses a generator to create the function to be called as a middleware.
        return function checkRole(req, res, callback) {
            checkAuthentication(req, res, function checkRoles(err) {
                if (err) {
                    callback(err);
                }
                else if (req.session.user.roles &&
                    req.session.user.roles.indexOf(role) !== -1) {
                    // All is good.
                    callback();
                } else {
                    callback(new Error('Required role not found'));
                }
            });
        };
    }

    return next(null, {
        populateVisualizationList: populateVisualizationList,
        populateVisualization: populateVisualization,
        providerGet: providerGet,
        authenticateUser: authenticateUser,
        checkAuthentication: checkAuthentication,
        hasRole: hasRole
    });
}

// This task depends on the `validators` task.
module.exports = ['validators', middleware];
