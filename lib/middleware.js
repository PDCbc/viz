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
     * @param {Function} next The callback of the function. Signature (error, request)
     */
    function hubapiGet(req, path, next) {

      //wrap everything in a try-catch to make sure that we don't crash the visualizer if 
      //something breaks. 
      try{

        auth.verifyAuth(
          req.session.bakedCookie,
          function (err, body){

            if( err ){

              //pass the error onward. 
              next(err, null); 

            }else{

              if(!(body.federation && body.jurisdiction && body.username)){

                logger.warn("middleware.hubapiGet() : User verification failed."); 
                next(401, null);
                return;

              }else if(!(body.clinic && body.clinician)){

                logger.warn("middleware.hubapiGet() : User does not exist in auth."); 
                next(401, null);
                return;

              }

              require('request').get(
                { url: process.env.HUBAPI_URL + path + '?cookie=' + req.session.bakedCookie, json: true },
                function (error, response, body) {

                    //using this we can handle various response codes.
                    //currently all error/failures are handled the same way,
                    // but we might want to change this in the future. 
                    switch( response.statusCode ){

                        case 200: 

                            if( body && response){

                                next(null, response); 

                            }else{

                                logger.warn("auth.getBakedCookie() : body returned from auth was not valid : "+util.inspect(body, false ,null)); 
                                next(500, null); 

                            }

                            break; 

                        case 400:
                            logger.warn("auth.getBakedCookie() : request to auth component was not well formed: "+util.inspect(error, false ,null)); 
                            next(400, null); 
                            break; 

                        case 401:
                            logger.warn("auth.getBakedCookie() : Invalid credentials provided. error was: "+util.inspect(error, false, null)); 
                            next(401, null); 
                            break; 

                        case 500:
                            logger.error("auth.getBakedCookie() : Generated a server error : "+util.inspect(error, false , null)); 
                            next(500, null); 
                            break;

                        default:
                            logger.warn("auth.getBakedCookie() : Not sure how to handle statusCode: "+response.statusCode);
                            next(response.statusCode, null);
                            break;

                    }

                    return;

                }

              );

            }

          }

        );

      }catch(e){

        logger.error("middleware.hubapiGet() caught an exception: "+ util.inpsect(e, false, null) ); 
        callback(500, null); 

      }

    }

    /**
     * Makes a request to the hupapi for a list of visualizations and attaches it to `req.visualizations`.
     * 
     * If the request to the hubapi or auth components fail, this function will not call the next middleware,
     * instead it will cause a failure and load the default error page. 
     * 
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualizationList(req, res, callback) {

        // TODO: Cache this per user.

        try{

          hubapiGet(req, '/api/queries', function validation(error, response) {

              if (error) {  //an error code 400, 401, 500...
              
                switch(error){

                  case 401:

                    delete req.session.user;
                    delete req.session.bakedCookie;
                    res.render('error', { message : "middleware.populateVisualizationList failed due to failure to authenticate.", redirect : '/auth'}); 
                    break;

                  case 500:

                    res.render('error', {message : 'middleware.populateVisualizationList failed due to a server failure.', redirect : '/'}); 
                    break;

                  default:

                    res.render('error', { message : "middleware.populateVisualizationList failed", redirect : '/'}); 
                    break; 

                }

              }else{

                req.pdc_queries = response.body.queries.filter(function removeNonPDC(x) {

                  if (x && x.title && x.executions ){

                    return x.title.indexOf("PDC")!=-1 && x.executions.length > 0;

                  }else{

                    return false; 

                  }

                });

                req.integrity_queries = response.body.queries.filter(function removeNonPDC(x) {

                  if( x && x.title && x.executions ){

                    return x.title.indexOf("Integrity")!=-1 && x.executions.length > 0;

                  }else{

                    return false; 

                  }

                });

                callback();

              }

          });

      }catch(e){

        logger.error( "middleware.populateVisualizationList caught an exception: "+ util.inspect(e, false, null) ); 
        res.render('error', { message : 'An exception was thrown by the server: ' + util.inspect(e, false, null) }); 

      }

    }
    /**
     * Makes a request to the hubapi API for a single visualization and attaches it to `req.visualization`.
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function populateVisualization(req, res, callback) {

      try{

        if (!req.params.title) { 

          res.render( 'error' , { message : 'please provide a title for the visualization in the URL.', redirect:'/' }); 
          return; 

        }

        // TODO: Don't use a static.

        var address;

        if(req.params.title==='PDC-055'){

          address='/medclass';

        }else if(req.params.title==='PDC-001'){

          address = '/demographics/';

        }
        else if(req.params.title.indexOf('PDC')===0){

          address = '/api/processed_result/' + req.params.title + '/';

        }else{

          logger.error('unrecognized query: ' + req.params.title);
          return;

        }

        hubapiGet(req, address, function validation(error, request) {

            if ( error ){

                switch(error){

                  case 401:

                    delete req.session.user;
                    delete req.session.bakedCookie;
                    res.render('error', { message : "middleware.populateVisualizationList failed due to failure to authenticate.", redirect : '/auth'}); 
                    return; 
                    break;

                  case 500:

                    res.render('error', {message : 'middleware.populateVisualizationList failed due to a server failure.', redirect : '/'}); 
                    return; 
                    break;

                  default:

                    res.render('error', { message : "middleware.populateVisualizationList failed", redirect : '/'}); 
                    return; 
                    break; 

                }

            }

            if( request && request.body ){

              req.visualization = request.body;
              callback();

            }else{

              res.render('error', { message : "middleware.populateVisualizationList failed", redirect : '/'}); 

            }
            

        });

      }catch(e){

        logger.error("Caught exception in middleware.populateVisualization() : "+ util.inspect( e, false, null ) ); 

      }
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
        
    }

    /**
     * Attempts to authenticate the user with the auth component. 
     * 
     * This function will redirect to the appropriate page if authentication
     * fails. In which case the callback will not be called. 
     * 
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The Express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function authenticateUser(req, res, callback) {

        if (!req.body.jur && !req.body.user && !req.body.password) {

            res.statusCode = 401; 
            res.redirect('/auth', {message : "Please provide username, password, and jurisdiction"});

        }else{

            auth.getBakedCookie(req.body.juri, req.body.user, req.body.password, function (err, authResult) {

                if ( err ) {

                  switch( err ){

                    case 400: 

                      res.statusCode = 400; 
                      res.render('error', {message : "Malformed request object."}); 
                      break; 

                    case 401: 

                      res.statusCode = 401; 
                      res.render('auth', {message : 'Invalid username and password combination, please try again. ', redirect: '/auth'}); 

                      break; 
                    case 500:

                      res.statusCode = 500; 
                      res.render('error', {message : 'An internal server error occurred. Check logs for failure.'});
                      break; 

                  }

                } else {

                    if( !authResult || !authResult.cookie ){

                      delete req.session.bakedCookie;
                      delete req.session.user; 
                      res.statusCode = 500; 
                      res.render('error', {message : "Could not obtain a session from auth.", redirect : '/auth'}); 
                      return;

                    }else{


                      auth.verifyAuth(authResult.cookie, function (err, user) {

                          if ( err ){

                            delete req.session.user; 
                            delete req.session.bakedCookie;
                            res.statusCode = 500; 
                            res.render('error', {message : "Could not verify session with auth.", redirect : '/auth'}); 

                          }else{

                            //if we get here we have a valid session.
                            req.session.bakedCookie = authResult.cookie;
                            req.session.user = user;
                            callback(); 

                          }

                      });

                    }

                }

            });

        }
    }
    /**
     * Checks the authentication of the user. (Does not talk to the hubapi or auth)
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
