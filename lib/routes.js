'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');
    
function routes(next, data) {
    var router = new require('express').Router();
    router.get('/auth', function (req, res, callback) {
        console.error("Not implemented yet");
        callback();
    });
    router.get('/logout', function (req, res) {
        console.error("Logout called, but no auth implemented");
        res.redirect('/');
    });
    router.get('/',
        data.middleware.populateVisualizationList,
        function render(req, res) {
            res.render('index', {
                title: 'Welcome',
                user: 'Not Implemented Auth User',
                visualizations: req.visualizations
            });
        }
    );
    router.get('/visualization/:title',
        function (req, res, callback) { console.error("Auth not implemented yet."); callback(); },
        data.middleware.populateVisualization,
        data.middleware.populateVisualizationList,
        function render(req, res) {
            console.log("I GOT THERE");
            res.render('visualization', {
                title: req.params.title,
                user: 'Not implemented yet user',
                visualizations: req.visualizations,
                visualization: req.visualization
            });
        }
    );
    // Attach the router.
    data.httpd.use(router);
    next(null, router);
}

module.exports = [ 'validators', 'models', 'httpd', routes ];
