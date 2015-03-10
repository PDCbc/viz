'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger'),
    request = require('request');

// TODO
function hasRoles(roles) {
    return function(req, res, next) {
        if (!req.session.user) {
            if (!req.headers.token) {
                return next(new Error("No bakedCookie header present."));
            }
            verifyAuth(req.headers.token, function (err, unbaked) {
                if (err) {
                    logger.error(err);
                    return next(new Error("Couldn't request from auth."));
                } else {
                    req.session.user = unbaked;
                    finish();
                }
            });
        } else {
            finish();
        }
        function finish() {
            // console.log(req.session);
            var valid = _.all(roles, function (role) {
                if (req.session.user.roles.indexOf(role) == -1) {
                    return false;
                } else {
                    return true;
                }
            });
            if (valid) {
                // console.log("Is all valid");
                return next(null);
            } else {
                // console.log("Is not valid");
                return next(new Error("Roles not present."));
            }
        }
    };
}

function getBakedCookie(juri, user, pass, next) {
    request.post({
        url: process.env.AUTH_CONTROL + '/auth/login',
        form: {
            juri: juri,
            user: user,
            pass: pass,
            respond: "1"
        },
        json: true
    }, function gotReponse(err, res, body) {
        console.log(body);
        if (err) {
            next(err, null);
        } else {
            next(null, body);
        }
    });
}

function verifyAuth(bakedCookie, next) {
    request.post({
        url: process.env.AUTH_CONTROL + '/verify',
        form: {
            bakedCookie: bakedCookie
        },
        json: true
    }, function gotResponse(err, res, body) {
        if (err) {
            next(err, null);
        } else {
            next(null, body);
        }
    });
}

module.exports = {
    hasRoles: hasRoles,
    getBakedCookie: getBakedCookie,
    verifyAuth: verifyAuth
};
