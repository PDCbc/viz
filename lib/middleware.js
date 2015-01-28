'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

var util = require('util');
/**
 * Middleware for requests to the provider.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `validators`
 */
function middleware(next, data) {
  var default_months = 36;

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
        providerGet(req, '/api/queries', function validation(error, response) {
            if (error) { return callback(error); }

            req.pdc_queries = response.body.queries.filter(function removeNonPDC(x) {
                return x.title.indexOf("PDC")!=-1;
            });

            req.integrity_queries = response.body.queries.filter(function removeNonPDC(x) {
              return x.title.indexOf("Integrity")!=-1;
            });
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
        providerGet(req, '/api/processed_result/' + req.params.title + '/' + req.params.endpoint + '/' + req.params.provider, function validation(error, request) {
            if (error) { return next(error); }
            req.visualization = request.body;
            callback();
        });
    }
//548f70f34fe634b592000002
//27542
    /**
    * Makes a request to the provider API for a single visualization and attaches it to `req.visualization`.
    * @param {Object}   req      The Express req object.
    * @param {Object}   res      The Express res object.
    * @param {Function} callback The next middleware to invoke.
    */
    function populateIntegrityVisualization(req, res, callback) {
        if (!req.params.title) { return res.redirect('/'); }
        // TODO: Don't use a static.
        providerGet(req, '/api/integrity/' + req.params.title + '/54bea239ff60a6dd0c000002/45567/' + default_months, function validation(error, request) {
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
              if(error)
              {
                console.log("error: " + util.inspect(error));
              }
              else if (response.statusCode === 200) {
                  req.session.user = response.body;
                  callback();
              }
              else {
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

      if (!req.session || !req.session.user) { // No session on record or user not logged in
          //req.session.message = 'No User found... Please log in.';
          res.status(401).redirect('/auth');
      } else { // Session must exist.
          callback();
      }
    }
    return next(null, {
        populateVisualizationList: populateVisualizationList,
        populateVisualization: populateVisualization,
        populateIntegrityVisualization: populateIntegrityVisualization,
        providerGet: providerGet,
        authenticateUser: authenticateUser,
        checkAuthentication: checkAuthentication
    });
}

// This task depends on the `validators` task.
module.exports = ['validators', middleware];
