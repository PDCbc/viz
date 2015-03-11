'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

var util = require('util'),
    auth = require('./auth');
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

      console.log('ajax request to: ' + process.env.HUBAPI_URL + path);

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

        logger.log('popvislist: visualization - ' + util.inspect(req.visualization, false, null));

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

        var prefix;

        if(req.params.title==='PDC-055')
        {
          prefix='/medclass/';
        }
        else if(req.params.title==='PDC-001')
        {
          prefix = '/demographics/';
        }
        else if(req.params.title.indexOf('PDC')===0)
        {
          prefix = '/api/processed_result/' + req.params.title + '/';
        }
        else
        {
          logger.error('unrecognized query: ' + req.params.title);
          return;
        }

        hubapiGet(req, prefix  + req.session.user.clinic + '/' + req.session.user.clinician + '/', function validation(error, request) {
            if (error)
            {
              logger.error(error);
              return next(error);
            }
            req.visualization = request.body;
            callback();
        });
    }

    /**
    * Makes a request to the hubapi for a single visualization and attaches it to `req.visualization`.
    * @param {Object}   req      The Express req object.
    * @param {Object}   res      The Express res object.
    * @param {Function} callback The next middleware to invoke.
    */
    function populateIntegrityVisualization(req, res, callback) {
        if (!req.params.title) { return res.redirect('/'); }
        // TODO: Don't use a static.
        hubapiGet(req, '/integrity/' + req.params.title + '/' + req.session.user.clinic + '/' + req.session.user.clinician + '/' + default_months, function validation(error, request) {
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
        if (!req.body.jur && !req.body.user && !req.body.password) {
            req.session.message = "Please provide a jur, username, and password in the request body.";
            res.status(401).redirect('/auth');
        } else {
            auth.getBakedCookie(req.body.juri, req.body.user, req.body.password, function (err, bakedCookie) {
                console.log(bakedCookie);
                if (err) {
                    callback(err);
                } else {
                    req.session.bakedCookie = bakedCookie;
                    auth.verifyAuth(bakedCookie, function (err, user) {
                        req.session.user = user;
                        req.session.user.clinic = '54f61f04f2ba32ae00000002';
                        req.session.user.clinician = 'cpsid';
                        console.log('req.session.user: ' + util.inspect(req.session.user, false, null));
                        callback();
                    });
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
