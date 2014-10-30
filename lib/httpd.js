'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function httpd(next, data) {
    var server = require('express')();
    // Set the server engine.
    server.set('view engine', 'hbs');
    // Page Routes
    require('hbs').registerPartials(__dirname + '/views/partials');
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
        cookie: { secure: true }
    }));
    // Protects against CSRF.
    // server.use(require('csurf')());
    // Compresses responses.
    server.use(require('compression')());
    return next(null, server);
}

module.exports = [ 'environment', httpd ];
