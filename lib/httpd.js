'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Create and configure the express server.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains the results of `environment`.
 */
function httpd(next, data) {
    var server = require('express')();
    // Set the server engine.
    server.set('view engine', 'hbs');
    // Page Routes
    require('hbs').registerPartials(__dirname + '/../views/partials');
    require('hbs').registerHelper('json', function(data) {
        return JSON.stringify(data);
    });
    // Middleware (https://github.com/senchalabs/connect#middleware)
    // Ordering ~matters~.
    // Logger
    server.use(require('morgan')('dev'));
    // Parses Cookies
    server.use(require('cookie-parser')(process.env.SECRET));
    // Parses bodies.
    server.use(require('body-parser').urlencoded({ extended: true }));
    server.use(require('body-parser').json());
    // Static serving of the site from `site`
    server.use('/assets', require('serve-static')('assets'));
    // Session store
    server.use(require('express-session')({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }));
    // Protects against CSRF.
    // server.use(require('csurf')());
    // Compresses responses.
    server.use(require('compression')());

    logger.warn('httpd');

    return next(null, server);
}

// This module depends on the `environment` task.
module.exports = [ 'environment', httpd ];
