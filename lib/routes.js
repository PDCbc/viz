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
    var util = new require('util');
    /* Index */
    router.get('/',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualizationList,
        function render(req, res) {
          console.log('req: ' + util.inspect(req, false, null));

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
          var errorMessage;

          var visualizationKeys = [];

          var query;
          var filteredQueries = req.pdc_queries.filter(
            function(x) {
              return x.title === req.params.title;
            });

          if(filteredQueries.length != 1)
          {
            errorMessage = 'not 1 and only one query by the name: ' + req.params.title;
            logger.error('visualization/:title/:endpoint/:provider: ' + errorMessage);
            res.status(500).json({error:errorMessage});
            return;
          }

          query = filteredQueries[0];

          if(!query.executions)
          {
            errorMessage = 'query - ' + req.params.title + ' has undefined executions';
            logger.error('visualization/:title/:endpoint/:provider:' + errorMessage);
            res.status(500).json({error:errorMessage});
            return;
          }

          if(query.executions.length<1)
          {
              errorMessage = 'no executions for: ' + req.params.title + ' on EP: ' + req.params.endpoint;
              logger.error('visualization/:title/:endpoint/:provider:' + errorMessage);
              res.status(500).json({error:errorMessage});
              return;
          }

          var lineVisQueries = ['PDC-009', 'PDC-014'];

          if(req.params.title === 'PDC-001')
          {
            req.visualization.script = 'DemographicsPyramidVis';
          }
          else if(req.params.title === 'PDC-055')
          {
            req.visualization.script =  'ClusterBarVis';
          }
          else if(req.params.title === 'PDC-053')
          {
            req.visualization.script = 'BarVis';
          }
          else if(lineVisQueries.indexOf(req.params.title) > -1)
          {
            req.visualization.script = 'LineVis';
          }

          if(req.visualization.script === null || req.visualization.script === undefined )
          {
            errorMessage = 'no visualization specified';
            logger.error('visualization/:title/:endpoint/:provider: ' + errorMessage);
            res.json({error:errorMessage});
            return;
          }

          fs.readFile('./visualizations/' + req.visualization.script + '.html', function callback(err, script) {
              if (err) {
                  logger.error('visualization/:title/:endpoint/:provider: ' + err);
              } else {
                  res.render('visualization', {
                      title: req.params.title,
                      user: req.session.user,
                      pdc_queries: req.pdc_queries,
                      integrity_queries: req.integrity_queries,
                      visualization: req.visualization,
                      script: script
                  });
              }
          });
        });

    /* An Integrity Visualization */
    router.get('/integrity_visualization/:title/:endpoint/:provider/:months',
      data.middleware.checkAuthentication,
      data.middleware.populateIntegrityVisualization,
      data.middleware.populateVisualizationList,
      function render(req, res) {
        logger.log('render integrity visualization');

        console.log('integrity visualization:');
        console.log(util.inspect(req.visualization));

        if (req.visualization.script === undefined) {
          logger.success('setting req.visualization.script for integrity visualization');
          logger.warn('vis: ' + util.inspect(req.visualization));
          req.visualization.script = "IntegrityLineVis";
          logger.success('set req.visualization.script for integrity visualization : ' + req.visualization.script);
          req.visualization.yaxisScale = "absolute";
          req.visualization.yaxisLabel = "Duplicate Key Count";

        }
        else
        {
            logger.error('failed to set integrity visualization script - value was: ' + req.visualization.script);
        }

        fs.readFile('./visualizations/' + req.visualization.script + '.html', function callback(err, script) {
          if (err) {
            logger.error('integrity route: ' + err);
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
            console.log('AUTH req: ' + util.inspect(req, false, null));
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

module.exports = ['httpd', 'middleware', routes ];
