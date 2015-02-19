'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

var util = require('util');
/**
 * Middleware for requests to the hubapi.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `validators`
 */
function middleware(next, data) {
  var default_months = 36;

    /**
     * Make a GET request to the hubapi.
     * @param {Object}   req      The express `req` object.
     * @param {String}   path     The desired URI on the hubapi.
     * @param {Function} callback The callback of the function. Signature (error, request)
     */
    function hubapiGet(req, path, callback) {

      require('request').get({ url: process.env.HUBAPI_URL + path, json: true }, function (error, request, body) {
          callback(error, request);
      });
      // Callback should be (error, request)
    }
    /**
     * Make a POST request to the hubapi.
     * @param {Object}   req      The express `req` object.
     * @param {String}   path     The desired URI on the hubapi.
     * @param {Object}   data     The data to send.
     * @param {Function} callback The callback of the function. Signature (error, request)
     */
    function hubapiPost(req, path, data, callback) {
        require('request').post({ url: process.env.HUBAPI_URL + path, json: true, form: data }, function (error, request, body) {
            callback(error, request);
        });
        // Callback should be (error, request)
    }
    /**
     * Makes a request to the hupapi for a list of visualizations and attaches it to `req.visualizations`.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualizationList(req, res, callback) {
        // TODO: Cache this per user.
        hubapiGet(req, '/api/queries', function validation(error, response) {
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
     * Makes a request to the hubapi API for a single visualization and attaches it to `req.visualization`.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualization(req, res, callback) {
        if (!req.params.title) { return res.redirect('/'); }
        // TODO: Don't use a static.

        logger.success('req');
        var prefix;

        console.log('title: **' + req.params.title + '**');
        if(req.params.title==='PDC-055')
        {
          prefix='/medclass';
        }
        else if(req.params.title==='Demographics-PDC-001')
        {
          prefix = '/demographics';
        }
        else if(req.params.title.indexOf('PDC')===0)
        {
          prefix = '/api/processed_result/' + req.params.title;
        }
        else
        {
          logger.error('unrecognized query: ' + req.params.title);
          return;
        }

        hubapiGet(req, prefix  + '/54dd2e05f2ba32971f000014/cpsid/', function validation(error, request) {
            if (error) { return next(error); }

            console.log('body: ' + util.inspect(request.body, false, null));
            req.visualization = request.body;
            callback();
        });
    }
//548f70f34fe634b592000002
//27542
    /**
    * Makes a request to the hubapi for a single visualization and attaches it to `req.visualization`.
    * @param {Object}   req      The Express req object.
    * @param {Object}   res      The Express res object.
    * @param {Function} callback The next middleware to invoke.
    */
    function populateIntegrityVisualization(req, res, callback) {
        if (!req.params.title) { return res.redirect('/'); }
        // TODO: Don't use a static.
        hubapiGet(req, '/integrity/' + req.params.title + '/54dd2e05f2ba32971f000014/cpsid/' + default_months, function validation(error, request) {
          if (error) { return next(error); }
            req.visualization = request.body;
            callback();
        });
    }

    /**
     * Attempts to authenticate the user with the hubapi.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function authenticateUser(req, res, callback) {
        if (!req.body.user && !req.body.password) {
            req.session.message = "Please provide a username and password in the request body.";
            res.status(401).redirect('/auth');
        } else {
            hubapiPost(req, '/auth', {username: req.body.username, password: req.body.password}, function result(error, response) {
              if(error)
              {
                logger.error("error during authentication: " + util.inspect(error));
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
     * Checks the authentication of the user. (Does not talk to the hubapi)
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

    /**
     * Checks to see if the user has the given role. TODO: Variable arguements.
     * @param {String} role The role to check for.
     * @return {Function}
     */
    function hasRoles() {
        var roles = Array.prototype.slice.call(arguments, 1);
        // Note this uses a generator to create the function to be called as a middleware.
        return function checkRoles(req, res, callback) {
            checkAuthentication(req, res, function checkRoles(err) {
                if (err) {
                    callback(err);
                }
                else if (req.session.user.roles) {
                    if (_.every(roles, function (role) {
                        return req.session.user.roles.indexOf(role) !== -1;
                    })) {
                        // All is good.
                        callback();
                    } else {
                        callback(new Error('Required role not found'));
                    }
                } else {
                    callback(new Error('Roles not found for user, check the roles file'));
                }
            });
        };
    }

    logger.warn('middleware');
    return next(null, {
        populateVisualizationList: populateVisualizationList,
        populateVisualization: populateVisualization,
        populateIntegrityVisualization: populateIntegrityVisualization,
        hubapiGet: hubapiGet,
        authenticateUser: authenticateUser,
        checkAuthentication: checkAuthentication,
        hasRoles: hasRoles
    });
}

// This task depends on the `validators` task.
module.exports = ['environment', middleware];
