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
      logger.warn("hubapiGet: "+ path);

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

              logger.success(process.env.HUBAPI_URL + path + '?cookie=' + req.session.bakedCookie);
              require('request').get(
                { url: process.env.HUBAPI_URL + path + '?cookie=' + req.session.bakedCookie, json: true },
                function (error, response, body) {

                    logger.warn("Response from HAPI for request to "+ path +" : "+ response.statusCode);

                    //using this we can handle various response codes.
                    //currently all error/failures are handled the same way,
                    // but we might want to change this in the future. 
                    switch( response.statusCode ){

                        case 200: 

                            if( body && response){

                                next(null, response); 

                            }else{

                                logger.warn("middleware.hubapiGet() : body returned from auth was not valid : "+util.inspect(body, false ,null)); 
                                next(500, null); 

                            }

                            break; 

                        case 204: 
                            logger.warn("middleware.hubapiGet(): received 204, request was successful but no data was returned.")
                            next(204, null);
                            break;

                        case 400:
                            logger.warn("middleware.hubapiGet() : request to auth component was not well formed: "+util.inspect(error, false ,null)); 
                            next(400, null); 
                            break; 

                        case 401:
                            logger.warn("middleware.hubapiGet() : Invalid credentials provided. error was: "+util.inspect(error, false, null)); 
                            next(401, null); 
                            break; 

                        case 404: 
                            logger.warn("middleware.hubapiGet() : 404 from hubapi, indicates query does not exist in the database. error:  "+util.inspect(error, false, null)); 
                            next(404, null);
                            break;

                        case 500:
                            logger.error("middleware.hubapiGet() : Generated a server error : "+util.inspect(error, false , null)); 
                            next(500, null); 
                            break;

                        default:
                            logger.warn("middleware.hubapiGet() : Not sure how to handle statusCode: "+response.statusCode);
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

                if ( error ) {  //an error code 204, 400, 401, 500...

                    switch( error ){

                    case 204:
                        //force query lists to empty and continue
                        req.pdc_queries = []; 
                        return callback(); 
                        break; 

                    case 401:

                        delete req.session.user;
                        delete req.session.bakedCookie;
                        res.status(401);
                        res.render('error', { message : "middleware.populateVisualizationList failed due to failure to authenticate.", redirect : '/auth'}); 
                        break;

                    case 500:

                        res.status(500);
                        res.render('error', {message : 'middleware.populateVisualizationList failed due to a server failure.', redirect : '/'}); 
                        break;

                    case 404: 

                        res.status(404);
                        res.render('error', {message : 'middleware.populateVisualizationList failed due auth or hubapi being unreachable', redirect : '/'}); 
                        break; 

                    default:

                        //in any other case, we can just populate the query list as empty: 
                        req.pdc_queries = [];
                        return callback(); 
                        break; 

                    }

                }else{

                    req.pdc_queries = response.body.queries.filter(

                        function removeNonPDC(x) {

                            if (x && x.title && x.executions ){

                                return x.title.indexOf("PDC")!=-1 && x.executions.length > 0;

                            }else{

                                return false; 

                            }

                        }

                    );

                    callback();

                }

            });

        }catch(e){

            logger.error( "middleware.populateVisualizationList caught an exception: "+ util.inspect(e, false, null) ); 
            res.status(500);
            res.render('error', { message : 'An exception was thrown by the server: ' + util.inspect(e, false, null) }); 
            return; 

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

            }else if(req.params.title.indexOf('PDC')===0){

                address = '/api/processed_result/' + req.params.title + '/';

            }else{

                logger.error('middleware.populateVisualization(): unrecognized query: ' + req.params.title);
                res.status(404);
                res.render('error', { message : 'Did not recognize the query: '+ req.params.title, redirect : '/' } );
                return;

            }

            hubapiGet(req, address, function validation(error, request) {

                if ( error ){

                    switch(error){

                        case 204:
                            logger.warn("middleware.populateVisualization could not find executions for query: "+ req.params.title+ " returning 404.");
                            res.status(404);
                            res.render('error', { message : "middleware.populateVisualization could not find executions for query: "+req.params.title, redirect : '/'}); 
                            return;
                            break;

                        case 401:

                            delete req.session.user;
                            delete req.session.bakedCookie;
                            logger.warn("middleware.populateVisualization failed to get visualization for: "+req.params.title+" due to failure to authenticate user");
                            res.status(401);
                            res.render('error', { message : "middleware.populateVisualization failed due to failure to authenticate.", redirect : '/auth'}); 
                            return; 
                            break;

                        case 404: 
                             
                            logger.warn("Hubapi did not find query: "+ req.params.title+" in the database.");
                            res.status(404);
                            res.render( 'error', { message : 'the query: '+req.params.title+' does not exist in the database. ', redirect: '/' } );
                            return; 
                            break; 

                        case 500:

                            logger.warn("Hubapi failed to fetch data for query: "+req.params.title+", returning 500");
                            res.status(500);
                            res.render('error', {message : 'middleware.populateVisualization failed due to a server failure.', redirect : '/'}); 
                            return; 
                            break;

                        default:

                            logger.warn("Unknown response from hubapi: "+ error+ " returning 500 to client.");
                            res.status(500);
                            res.render('error', { message : "middleware.populateVisualization failed with status code:" + error, redirect : '/'}); 
                            return; 
                            break; 

                    }

                }

                if( request && request.body ){

                    req.visualization = request.body;
                    callback();

                }else{

                    res.status(500);
                    res.render('error', { message : "middleware.populateVisualizationList failed", redirect : '/'}); 
                    return;

                }

            });

      }catch(e){

        logger.error("Caught exception in middleware.populateVisualization() : "+ util.inspect( e, false, null ) ); 

      }
    }

    /**
    * Stores the reports that are provided by the hubapi in a list stored in req.reports
    *
    * @param {Object}   req      The Express req object.
    * @param {Object}   res      The Express res object.
    * @param {Function} callback The next middleware to invoke.
    */
    function populateReportsList(req, res, callback){

        
        try{

            hubapiGet(req, '/reports', 

                function validation(error, response) {

                    var toReturn = []; 

                    if ( error ) { 

                        switch( error ){

                            case 401: 

                                //401 occurs if invalid credentials were provided. 
                                //in this case we would like to redirect them to auth.
                                delete req.session.bakedCookie;
                                delete req.session.user;  
                                logger.warn("middleware.populateReportsList failed to authenticate user while requesting reports from hubapi.");
                                res.status(401);
                                res.render( 'error', { message : 'unable to authenticate user.', redirect : '/auth'} );
                                return; 
                                break;

                            case 404: 

                                //could not communicate with hubapi or auth.
                                logger.warn("middleware.populateReportsList failed to communicate with hubapi or auth components.");
                                res.status(404);
                                res.render('error', { message : 'Could not communicate with hubapi or auth.', redirect : '/'} );

                            default:
                                //in every other case we shouldn't redirect to an error page, instead just 
                                //return an empty array for reports.
                                logger.warn("middleware.populateReportsList caused an error, returning empty list.");
                                req.reports = []; 
                                return callback()
                                break;

                        }

                    }else{

                        for( var i = 0; i < response.body.length; i++ ){

                            if ( response.body[i] && response.body[i].shortTitle ){

                                toReturn.push(shortTitle +=".csv"); 

                            }

                        }

                        req.reports = toReturn; 

                        return callback(); 

                    }


                }
            );

        }catch(e){

            logger.error("middleware.populateReportsList() caught an exception: "+ util.insepct(e, false, null));
            //if there was an error, we can just not return the report list.
            req.reports = [];
            return callback(); 

        }
        
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

      try{

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

                    case 404: 
                      res.statusCode = 404;
                      res.render('error', {message : 'Could not contact auth server.', redirect : '/auth'});
                      break;

                    case 500:

                      res.statusCode = 500; 
                      res.render('error', {message : 'An internal server error occurred. Check logs for failure.'});
                      break; 

                    default:

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
                            callback(err)

                          }else{

                            //if we get here we have a valid session.
                            req.session.bakedCookie = authResult.cookie;
                            req.session.user = user;
                            callback(); 

                          }

                      });

                    }

                }

            }

          );

        }

      }catch(e){

        logger.error(util.inspect(e, false, null));
        res.statusCode = 500; 
        res.render('error', {message : "An exception occured: "+ util.inspect(e, false, null), redirect : '/auth'}); 
        return;

      }
    }
    /**
     * Checks the authentication of the user. (Does not talk to the hubapi or auth)
     * @param {Object}   req      The Express req object.
     * @param {Object}   res      The express res object.
     * @param {Function} callback The next middleware to invoke.
     */
    function checkAuthentication(req, res, callback) {

        try{

            if (!req.session || !req.session.user) { // No session on record or user not logged in

                //req.session.message = 'No User found... Please log in.';
                res.status(401)
                res.redirect('/auth');

            } else { // Session must exist.

                callback();

            }

        }catch(e){

            logger.error(util.inspect(e, false, null));
            res.status(500);
            res.render('error', {message : "An exception occurred: "+ util.inspect(e, false, null), redirect : '/auth'}); 
            return; 

        }

    }

    return next(null, {

        populateVisualizationList: populateVisualizationList,
        populateVisualization: populateVisualization,
        populateReportsList: populateReportsList,
        hubapiGet: hubapiGet,
        authenticateUser: authenticateUser,
        checkAuthentication: checkAuthentication,

    });
}

// This task depends on the `validators` task.
module.exports = ['environment', middleware];
