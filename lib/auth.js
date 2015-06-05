'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger'),
    request = require('request'),
    util = require('util');

// TODO
function hasRoles(roles) {
    return function(req, res, next) {

        if (!req.session.user) {

            if (!req.headers.token) {
                
                return next(new Error("No bakedCookie header present."));
            }

            verifyAuth(req.headers.token, function (err, result) {

                if (err) {

                    logger.error('HAS_ROLES: ' + err);
                    return next(new Error("Couldn't request from auth."));

                } else {

                    var unbaked = result.data; 
                    req.session.user = unbaked;
                    finish();

                }

            });

        } else {

            finish();

        }

        function finish() {

            var valid = _.all(roles, function (role) {
                if (req.session.user.roles.indexOf(role) == -1) {
                    return false;
                } else {
                    return true;
                }
            });
            if (valid) {
                return next(null);
            } else {
                return next(new Error("Roles not present."));
            }
        }
    };
}

function getBakedCookie(juri, user, pass, next) {

    logger.log('GET_BAKED_COOKIE: calling - ' + process.env.AUTH_CONTROL_URL + '/auth/login');

    request.post({
        url: process.env.AUTH_CONTROL_URL + '/auth/login',
        form: {
            juri: juri,
            user: user,
            pass: pass,
            respond: "1"
        },

        json: true

    }, function gotReponse(err, res, body) {
        
        return handleAuthResponse(err, res, body, next); 

    });
}

/** 
* Determines whether a cookie is valid by passing it to
* the auth component for verification.
* 
* 
* @param bakedCookie {String} - the cookie that was passed from the browser
* @param next {Function} - The function to call after we are done the work here. 
*   Function should have prototype like: Function foo(err, data) 
*       - Where err is the  status code returned from the auth component and data is the data object. 
*       - If there was an error the data field will be set to null. 
*       - If there was no error (a valid response) then the error field will be null. 
*/
function verifyAuth(bakedCookie, next) {

    request.post({
        url: process.env.AUTH_CONTROL_URL + '/verify',
        form: {
            bakedCookie: bakedCookie
        },
        json: true

    }, function gotResponse(err, res, body) {

        return handleAuthResponse(err, res, body, next); 

    });
}

/**
* Handles the response from the auth component. This is set up
* to handle the response based on the status code that auth returns. 
* 
* This function then invokes the next that is passed in. 
*
* @param err {Object} - An error object from auth.
* @param res {Object} - Response object from the request library.
* @param body {Object} - The data returned from auth. 
* @param next {Funciton} - the next function to call. Has prototype like: 
*   Function foo(err, data) 
*       - Where err is the  status code returned from the auth component and data is the data object. 
*       - If there was an error the data field will be set to null. 
*       - If there was no error (a valid response) then the error field will be null. 
*/
function handleAuthResponse (err, res, body, next){

    //using this we can handle various response codes.
    //currently all error/failures are handled the same way,
    // but we might want to change this in the future. 
    switch( res.statusCode ){

        case 200: 

            if( body ){

                next(null, body); 

            }else{

               logger.warn("auth.getBakedCookie() : body returned from auth was not valid : "+util.inspect(body, false ,null)); 
                next(500, null); 

            }

            break; 

        case 400:
            logger.warn("auth.getBakedCookie() : request to auth component was not well formed: "+util.inspect(err, false ,null)); 
            next(400, null); 
            break; 

        case 401:
            logger.warn("auth.getBakedCookie() : Invalid credentials provided. error was: "+util.inspect(err, false, null)); 
            next(401, null); 
            break; 

        case 500:
            logger.error("auth.getBakedCookie() : Generated a server error : "+util.inspect(err, false , null)); 
            next(500, null); 
            break;

        default:
            logger.warn("auth.getBakedCookie() : Not sure how to handle statusCode: "+res.statusCode);
            next(res.statusCode, null);
            break;

    }
    return; 

}

module.exports = {
    hasRoles: hasRoles,
    getBakedCookie: getBakedCookie,
    verifyAuth: verifyAuth
};
