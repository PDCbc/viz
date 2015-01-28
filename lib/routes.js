'use strict';
var async = require('async'),
    _ = require('lodash'),
    fs = require('fs'),
    logger = require('./logger');

/**
 *  * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `validators`, `models`, and `httpd` task.
 */
function routes(next, data) {
    var router = new require('express').Router();

    /* Index */
    router.get('/',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualizationList,
        function render(req, res) {
            res.render('index', {
                title: 'Welcome',
                user: req.session.user,
                pdc_queries: req.pdc_queries,
                integrity_queries: req.integrity_queries
            });
        }
    );

    /* A Visualization */
    router.get('/visualization/:title/:endpoint/:provider',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualization,
        data.middleware.populateVisualizationList,
        function render(req, res) {
            if (req.visualization.script === undefined) {
                req.visualization.script = "LineVis";
            }
            fs.readFile('./visualizations/' + req.visualization.script + '.html', function callback(err, script) {
                if (err) {
                    logger.error(err);
                } else {
                    res.render('visualization', {
                        title: req.params.title,
                        user: 'Not implemented yet user',
                        pdc_queries: req.pdc_queries,
                        integrity_queries: req.integrity_queries,
                        visualization: req.visualization,
                        script: script
                    });
                }
            });
        }
    );

    /* An Integrity Visualization */
    router.get('/integrity_visualization/:title/:endpoint/:provider/:months',
      data.middleware.checkAuthentication,
      data.middleware.populateIntegrityVisualization,
      data.middleware.populateVisualizationList,
      function render(req, res) {
        if (req.visualization.script === undefined) {
          req.visualization.script = "IntegrityLineVis";
          req.visualization.yaxisScale = "absolute";
          req.visualization.yaxisLabel = "Duplicate Key Count";
        }
        fs.readFile('./visualizations/' + req.visualization.script + '.html', function callback(err, script) {
          if (err) {
            logger.error(err);
          } else {
            res.render('visualization', {
              title: req.params.title,
              user: 'Not implemented yet user',
              pdc_queries: req.pdc_queries,
              integrity_queries: req.integrity_queries,
              visualization: req.visualization,
              script: script
            });
          }
        });
      }
    );

    /* Authentication */
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

    /* Log Out */
    router.get('/logout',
        function (req, res) {
            delete req.session.user;
            res.redirect('/');
        });

    // Attach the router.
    data.httpd.use(router);
    next(null, router);
}

// This task depends on `validators`, `models`, and `httpd`
module.exports = [ 'validators', 'models', 'httpd', routes ];
