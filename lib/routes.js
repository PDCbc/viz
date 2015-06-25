'use strict';
var async  = require('async'),
    _      = require('lodash'),
    fs     = require('fs'),
    logger = require('./logger');

/**
 *  * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `validators`, `models`, and `httpd` task.
 */
function routes(next, data) {
    var router = new require('express').Router();
    var util   = new require('util');

    /* Index */
    router.get('/',
        data.middleware.checkAuthentication,
        data.middleware.populateVisualizationList,
        data.middleware.populateReportsList,
        function render(req, res) {

            try {

                res.status(200);
                res.render('index', {
                        title      : 'Welcome',
                        user       : req.session.user,
                        pdc_queries: req.pdc_queries,
                        reports    : req.reports
                    }
                );

            } catch (e) {

                logger.error("Route: / caught an exception: " + util.inspect(e, false, null));
                res.status(500);
                res.render("error", {message: 'An error occurred while loading the home page.', redirect: '/'});
                return;

            }
        }
    );


    /* A Visualization */
    router.get('/visualization/:title/:endpoint/:provider',

        data.middleware.checkAuthentication,
        data.middleware.populateVisualization,
        data.middleware.populateVisualizationList,
        data.middleware.populateReportsList,
        function render(req, res) {

            try {

                var errorMessage      = null;
                var query             = null;
                var visualizationKeys = [];

                var filteredQueries = req.pdc_queries.filter(
                    function (x) {

                        return x.title === req.params.title;

                    }
                );

                if (filteredQueries.length !== 1) {

                    logger.error("visualization/:title/:endpoint/:provider: Number of queries in database with title " + req.params.title + " was not exactly 1.");
                    res.status(500)
                    res.render("error", {
                        message : "Number of queries in database with title " + req.params.title + " was not exactly 1",
                        redirect: '/'
                    });
                    return;

                }

                //the first and only query in the list should be the one we are looking at. 
                query = filteredQueries[0];

                if (!query.executions) {

                    errorMessage = 'query - ' + req.params.title + ' has undefined executions';
                    logger.error('visualization/:title/:endpoint/:provider:' + errorMessage);
                    res.status(500)
                    res.render('error', {message: errorMessage, redirect: '/'});
                    return;

                }

                //check that we actually have executions on the query to return.
                if (query.executions.length < 1) {

                    //no content provided, so we return with 404 and redirect to an error page.
                    errorMessage = 'no executions for: ' + req.params.title + ' on EP: ' + req.params.endpoint;
                    logger.error('visualization/:title/:endpoint/:provider:' + errorMessage);
                    res.status(404)
                    res.render("error", {
                        message : "There were not executions found for query: " + req.params.title,
                        redirect: '/'
                    });
                    return;

                }

                var lineVisQueries       = [
                        'PDC-008', 'PDC-009', 'PDC-014',
                        'PDC-020', 'PDC-022', 'PDC-025',
                        'PDC-026', 'PDC-027', 'PDC-028',
                    ],

                    clusterBarVisQueries = ['PDC-055'],
                    barVisQueries        = ['PDC-053', 'PDC-054', 'PDC-056', 'PDC-057', 'PDC-058', 'PDC-1178', 'PDC-1738'],
                    demoPyramidQueries   = ['PDC-001'];

                if (demoPyramidQueries.indexOf(req.params.title) > -1) {

                    req.visualization.script = 'DemographicsPyramidVis';

                } else if (clusterBarVisQueries.indexOf(req.params.title) > -1) {

                    req.visualization.script = 'ClusterBarVis';

                } else if (barVisQueries.indexOf(req.params.title) > -1) {

                    req.visualization.script = 'BarVis';

                } else if (lineVisQueries.indexOf(req.params.title) > -1) {

                    req.visualization.script = 'LineVis';

                } else {

                    req.visualization.script = null;

                }

                if (req.visualization.script === null || req.visualization.script === undefined) {

                    logger.error('visualization/:title/:endpoint/:provider: no visualization specified for query : ' + req.params.title);
                    res.status(500);
                    res.render('error', {
                        message : "Could not find a visualization for query: " + req.params.title,
                        redirect: '/'
                    });
                    return;

                }

                fs.readFile('./visualizations/' + req.visualization.script + '.html',
                    function callback(err, script) {

                        try {

                            if (err) {

                                logger.error('visualization/:title/:endpoint/:provider: tried to read visualization script: ' + script + ', failed with error:  ' + util.inspect(err, false, null));
                                res.status(500);
                                res.render('error', {
                                    message : 'Could not load visualization for query : ' + req.params.title,
                                    redirect: '/'
                                });
                                return;

                            } else {

                                res.render('visualization', {

                                        title        : req.params.title,
                                        user         : req.session.user,
                                        pdc_queries  : req.pdc_queries,
                                        reports      : req.reports,
                                        visualization: req.visualization,
                                        script       : script

                                    }
                                );

                            }

                        } catch (e) {

                            logger.error("/visualization/:title/:endpoint/:provider caught an exception: " + util.inspect(e, false, null));
                            res.status(500);
                            res.render('error', {
                                message : "An exception occurred while trying load query: " + req.params.title + ".",
                                redirect: '/'
                            });
                            return;

                        }
                    }
                );

            } catch (e) {

                logger.error("/visualization/:title/:endpoint/:provider caught an exception: " + util.inspect(e, false, null));
                logger.error(e.stack);
                res.status(500);
                res.render('error', {
                    message : "An exception occurred while trying load query: " + req.params.title + ".",
                    redirect: '/'
                });
                return;

            }

        }
    );

    /*
     * Route that handles requests for tabular reports
     */
    router.route('/report/:title').get(
        data.middleware.checkAuthentication,
        data.middleware.populateVisualizationList,
        data.middleware.populateReportsList,
        function render(req, res) {

            try {

                logger.warn("req for report: " + req.params.title);

                var t = req.params.title.replace(".csv", "");

                data.middleware.hubapiGet(req, "/reports/" + t + "/",

                    function complete(error, response) {

                        try {

                            if (error) {

                                switch (error) {

                                    case 204:
                                        logger.warn("Successfully fetched report: " + t + " from hubapi, but it contained no data, nothing to return.");
                                        res.status(404);
                                        res.render('error', {
                                            message : 'Successfully fetched report ' + t + ', but it had no data.',
                                            redirect: '/'
                                        });
                                        return;
                                        break;

                                    case 400:

                                        logger.warn("Failed to fetch report " + t + " from hubapi due to a malformed request.")
                                        res.status(400);
                                        res.render("error", {
                                            message : "routes: Failed to fetch report" + t,
                                            redirect: '/'
                                        })
                                        return;
                                        break;

                                    case 401:

                                        logger.warn("Could not fetch report " + t + " from server as the user's identity could not verified.");
                                        res.status(401);
                                        res.render("error", {
                                            message : "routes: Unable to verify identity, either the session expired or invalid there are credentials.",
                                            redirect: '/auth'
                                        })
                                        return;
                                        break;

                                    case 500:

                                        logger.error("Failed to fetch report: " + t + " from HubAPI.");
                                        res.status(500);
                                        res.render("error", {
                                            message : "routes: Failure to get report data from hubapi.",
                                            redirect: '/'
                                        })
                                        return;
                                        break;

                                    default:

                                        logger.error("Failed to fetch report: " + t + " from HubAPI, error code was: " + error);
                                        res.status(500);
                                        res.render("error", {
                                            message : "routes: Failure to get report data from hubapi.",
                                            redirect: '/'
                                        })
                                        return;
                                        break;

                                }

                            } else if (!response || !response.body) {

                                logger.error("Invalid response body returned from HubAPI.");
                                res.status(404);
                                res.render("error", {message: "Failure to get report data from hubapi.", redirect: '/'})
                                return;

                            } else {

                                res.status(200);
                                return res.send(new Buffer(response.body));

                            }

                        } catch (e) {

                            logger.error("/report/title caught an exception: " + util.inspect(e, false, null));
                            res.status(500);
                            res.render('error', {message: 'Failed to get report data from hubapi.', redirect: '/'});
                            return;

                        }

                    }
                );

            } catch (e) {

                logger.error("/report/title caught an exception: " + util.inspect(e, false, null));
                res.status(500);
                res.render('error', {message: 'Failed to get report data from hubapi.', redirect: '/'});
                return;

            }

        }
    );


    /* Authentication */
    router.route('/auth')

        .get(function (req, res) {

            try {

                var message;

                if (req.session.message) {

                    message             = req.session.message;
                    logger.warn(message);
                    req.session.message = null;

                }

                res.render('auth', {message: message, user: req.session.user});

            } catch (e) {

                logger.error(util.inspect(e, false, null));
                res.status(500);
                res.render('error', {
                    message : 'Internal server error: ' + util.inspect(e, false, null),
                    redirect: '/auth'
                });

            }

        }).post(
        data.middleware.authenticateUser,
        function (req, res) {

            try {

                res.redirect('/');

            } catch (e) {

                logger.error(util.inspect(e, false, null));
                res.status(500);
                res.render('error', {
                    message : 'Internal server error: ' + util.inspect(e, false, null),
                    redirect: '/auth'
                });

            }

        }
    );


    /* Log Out */
    router.get('/logout',

        function (req, res) {

            try {

                delete req.session.user;
                res.redirect('/');

            } catch (e) {

                logger.error("/logout caught an exception: " + util.inspect(e, false, null));
                res.redirect('/');

            }

        }
    );

    // Attach the router.
    data.httpd.use(router);
    next(null, router);
}

module.exports = ['httpd', 'middleware', routes];
