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

      auth.verifyAuth(req.session.bakedCookie,
        function (err, body)
        {
          if(err)
          {
            logger.error('HUBAPI_GET_AUTHCHECK: ' + err);
          }
          else
          {
            if(!(body && body.federation && body.jurisdiction && body.username))

            {
              var error1 = 'invalid cookie';
              callback(error1, null);
              return;
            }
            else if(!(body.clinic && body.clinician))
            {
              var error2 = 'user not configured';
              callback(error2, null);
              return;
            }


            logger.warn("hupapiGet: "+path)

            require('request').get({ url: process.env.HUBAPI_URL + path + '?cookie=' + req.session.bakedCookie, json: true },
              function (error, response, body) {

                if(error || response.statusCode !== 200){

                  var errorResponse;

                  if(error){

                    logger.error("hubapiGet Error ( code: "+response.statusCode+" ): "+error);
                    errorResponse = error;

                  }
                  else
                  {

                    errorResponse = util.inspect(response.body, false, null);
                  }

                  logger.error('HUBAPI_GET_RESPONSE: ' + errorResponse);

                  callback(errorResponse, null);

                  return;

                }

                callback(null, response);
                return;

              });

          }
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
                return x.title.indexOf("PDC")!=-1 && x.executions.length > 0;
            });

            req.integrity_queries = response.body.queries.filter(function removeNonPDC(x) {
              return x.title.indexOf("Integrity")!=-1 && x.executions.length > 0;
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

        var address;

        if(req.params.title==='PDC-055')
        {
          address='/medclass';
        }
        else if(req.params.title==='PDC-001')
        {
          address = '/demographics/';
        }
        else if(req.params.title.indexOf('PDC')===0)
        {
          address = '/api/processed_result/' + req.params.title + '/';
        }
        else
        {
          logger.error('unrecognized query: ' + req.params.title);
          return;
        }

        hubapiGet(req, address, function validation(error, request) {
            if (error)
            {
              var errorMessage = 'POPULATE_VISUALIZATION: ' + error;
              logger.error( errorMessage );
              res.json({'populateVisualization ERROR':errorMessage});
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
    * Stores the reports that are provided by the hubapi in a list stored in req.reports
    *
    * @param {Object}   req      The Express req object.
    * @param {Object}   res      The Express res object.
    * @param {Function} callback The next middleware to invoke.
    */
    function populateReportsList(req, res, callback){

        
        hubapiGet(req, '/reports', function validation(error, response) {

          if (error) { 

            return callback(error); 

          }else{

            for(var i = 0; i < response.body.length; i++){

              response.body[i].shortTitle +=".csv"

            }

            req.reports = response.body; 

          }

          callback(); 

        });
        
        //callback();


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
                if (err) {
                    callback(err);
                } else {
                    req.session.bakedCookie = bakedCookie;
                    auth.verifyAuth(bakedCookie, function (err, user) {
                        req.session.user = user;
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
        populateReportsList: populateReportsList,
        hubapiGet: hubapiGet,
        authenticateUser: authenticateUser,
        checkAuthentication: checkAuthentication,
        hasRoles: hasRoles
    });
}

// This task depends on the `validators` task.
module.exports = ['environment', middleware];
