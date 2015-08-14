'use strict';

var async = require('async'),
    _ = require('lodash'),
    logger = require('./lib/logger');

/**
 * Callback levels:
 *   - next: Top scope.
 *   - callback: Second scope.
 *   - cb: Third scope.
 *   ... After that, you're on your own.
 */

async.auto({
    environment: require('./lib/environment'),
    certificate: require('./lib/certificate'),
    middleware:  require('./lib/middleware'),
    httpd:       require('./lib/httpd'),
    routes:      require('./lib/routes')
}, complete);

/**
 * The final completion function. Throws any errors that arise, or listens.
 * @param  {Error}  error Any errors passed to us via `next(err, null)`` from tasks.
 * @param  {Object} data  The complete async data object.
 */
function complete(error, data) {
    if (error) { logger.error(error); throw error; }
    // No errors
    require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
        logger.success('Server listening on port ' + process.env.PORT);
    });

    //secondary server that redirects HTTP traffic onto the HTTPS routes.
    require('http').createServer(function(req, res){

        if(process.env.MODE === "DEV"){

            logger.log("Redirecting HTTP request to: "+"https://" + req.headers['host'].split(":")[0]+":"+process.env.PORT + req.url);
            res.writeHead(301, { "Location": "https://" + req.headers['host'].split(":")[0]+":"+process.env.PORT + req.url });

        }else{

            res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });

        }

        res.end();

    }).listen(process.env.PORT_VIZ_HTTP, function(){

        logger.success("HTTP->HTTPS Redirect server listening on port "+process.env.PORT_VIZ_HTTP);

    });
}
