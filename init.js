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
    validators:  require('./lib/validators'),
    database:    require('./lib/database'),
    certificate: require('./lib/certificate'),
    middleware:  require('./lib/middleware'),
    httpd:       require('./lib/httpd'),
    models:      require('./lib/models'),
    routes:      require('./lib/routes')
}, complete);

function complete(error, data) {
    if (error) { logger.error(error); throw error; }
    // No errors
    require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
        logger.success('Server listening on port ' + process.env.PORT);
    });
}
