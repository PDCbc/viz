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
          logger.log('render visualization');

          var visualizationKeys = [];

          var query;
          var filteredQueries = req.pdc_queries.filter(
            function(x) {
              return x.title === req.params.title;
            });

          if(filteredQueries.length != 1)
          {
            logger.error('not 1 and only one query by the name: ' + req.params.title);
            return;
          }

          query = filteredQueries[0];

          if(!query.executions)
          {
              logger.error('query - ' + req.params.title + ' has undefined executions');
              return;
          }

          if(query.executions.length<1)
          {
              logger.error('no executions for: ' + req.params.title + ' on EP: ' + req.params.endpoint);
          }

          if(req.params.title === 'PDC-001' ||
            req.params.title === 'PDC-001A-test')
          {
              visualizationKeys.push('v_DemographicsPyramidVis');
          }
          else if(req.params.title === 'PDC-055')
          {
            visualizationKeys.push('v_ClusterBarVis');
          }
          else if(req.params.title === 'PDC-009')
          {
            visualizationKeys.push('v_LineVis');
          }
          else if(req.params.title === 'PDC-014')
          {
            visualizationKeys.push('v_BarVis');
          }
          else
          {
            var visualizationKeyRegex = /^v_/;

            var execution;
            query.executions.reverse().every(
              function(x)
              {
                if(x.aggregate_result)
                {
                  execution = x;
                  return false;
                }

                return true;
              });

            Object.keys(query.executions[query.executions.length-1].aggregate_result).forEach(
                function(x){
                  if(x.match(visualizationKeyRegex))
                  {
                      visualizationKeys.push(x);
                  }
                });
          }
          if(visualizationKeys.length < 1 )
          {
            logger.error('no visualization specified');
            return;
          }

          req.visualization.script = visualizationKeys[0].substring('v_'.length);

          fs.readFile('./visualizations/' + req.visualization.script + '.html', function callback(err, script) {
              if (err) {
                  logger.error(err);
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

module.exports = ['httpd', 'middleware', routes ];
