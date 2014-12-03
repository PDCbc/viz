'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 *  * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `validators`, `models`, and `httpd` task.
 */
function routes(next, data) {
    var router = new require('express').Router();
    router.get('/',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualizationList,
        function render(req, res) {
            res.render('index', {
                title: 'Welcome',
                user: req.session.user,
                visualizations: req.visualizations
            });
        }
    );
    router.get('/visualization/:title',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualization,
        data.middleware.populateVisualizationList,
        function render(req, res) {
            res.render('visualization', {
                title: req.params.title,
                user: 'Not implemented yet user',
                visualizations: req.visualizations,
                visualization: req.visualization
            });
        }
    );
    router.route('/auth')
        .get(function (req, res) {
            var message;
            if (req.session.message) {
                message = req.session.message;
                logger.log(message);
                req.session.message = null;
            }
            res.render('auth', {message: message, user: req.session.user});
        })
        .post(data.middleware.authenticateUser, function (req, res) {
            res.redirect('/');
        });
    router.get('/logout',
        function (req, res) {
            req.session.user = null;
            res.redirect('/');
        });
    // Attach the router.
    data.httpd.use(router);
    next(null, router);
}

// This task depends on `validators`, `models`, and `httpd`
module.exports = [ 'validators', 'models', 'httpd', routes ];
