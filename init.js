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
  environment:     environment,
  validators:      validators,
  database:        [ 'environment', database ],
  certificate:     [ 'environment', certificate ],
  middleware:      middleware,
  httpd:           [ 'environment', httpd ],
  models:          [ 'database', models ],
  routes:          [ 'validators', 'models', 'httpd', routes ]
}, complete);

function environment(next) {
  if (!process.env.SECRET) {
    logger.warn('No $SECRET present. Generating a temporary random value.');
    process.env.SECRET = require('crypto').randomBytes(256);
  }
  if (!process.env.PORT) {
    logger.warn('No $PORT present. Choosing a sane default, 8081.');
    process.env.PORT = 8081;
  }
  if (!process.env.MONGO_URI) {
    logger.warn('No $MONGO_URI present. Defaulting to `mongodb://localhost/vis`.');
    process.env.MONGO_URI = 'mongodb://localhost/vis';
  }
  if (!process.env.PROVIDER_URL) {
    logger.warn('No PROVIDER_URL present. Defaulting to `https://localhost:8080`.');
    process.env.PROVIDER_URL = 'https://localhost:8080';
  }
  return next(null);
}

/**
 * Setup the SSL Certificates.
 * @param {Function} next - The callback.
 */
function certificate(next) {
  var fs = require('fs');
  // Get the certificates.
  async.auto({
    key:  function (callback) { fs.readFile('cert/server.key', 'utf8', callback); },
    cert: function (callback) { fs.readFile('cert/server.crt', 'utf8', callback); }
  }, function (error, results) {
    if (error) { generateCertificate(error, results, next); }
    else { return next(error, results); }
  });

  /**
   * Detects if certs are missing and generates one if needed
   * @param {Error|null}  error   - If `error` is non-null, generate a certificate, since one doesn't exist.
   * @param {Object|null} results - Passed to `next`.
   * @param {Function}    next    - The callback. Is passed `error` (if not a certificate error) and `results`.
   */
  function generateCertificate(error, results, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Tell Node it's okay.
    if (error && error.code === 'ENOENT') {
      logger.warn('No certificates present in `cert/{server.key, server.crt}`. Generating a temporary certificate.');
      require('pem').createCertificate({ days: 1, selfSigned: true }, function formatKey(error, keys) {
        if (error) { return next(error, null); }
        return callback(null, {key: keys.serviceKey, cert: keys.certificate });
      });
    } else {
      return callback(error, results);
    }
  }
}

function middleware(next, data) {
  function providerRequest(req, path, callback) {
    require('request').get({ url: process.env.PROVIDER_URL + path, json: true }, function (error, request, body) {
      callback(error, request);
    });
    // Callback should be (error, request)
  }
  function populateVisualizationList(req, res, callback) {
    // TODO: Cache this per user.
    providerRequest(req, '/api', function validation(error, request) {
      if (error) { return next(error); }
      var validated = data.validators.list(request.body);
      console.log(validated.valid);
      if (validated.valid === true) {
        req.visualizations = request.body.visualizations;
        callback();
      } else {
        callback(new Error(JSON.stringify(validated, 2)));
      }
    });
  }
  function populateVisualization(req, res, callback) {
    if (!req.params.title) { return res.redirect('/'); }
    providerRequest(req, '/api/' + req.params.title, function validation(error, request) {
      if (error) { return next(error); }
      var validated = data.validators.item(request.body);
      if (validated.valid === true) {
        req.visualization = request.body;
        callback();
      } else {
        callback(new Error(JSON.stringify(validated, 2)));
      }
    });
  }
  return next(null, {
    populateVisualizationList: populateVisualizationList,
    populateVisualization: populateVisualization,
    providerRequest: providerRequest
  });
}

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

/**
 * This task sets up MongoDB and will not invoke next until it has either connected or errored.
 */
function database(next, data) {
  var connection = require('mongoose').connect(process.env.MONGO_URI).connection;
  // This is an event handler.
  // The mongoose library emits events (open or error) when it connects (or fails to)
  connection.on('open', function () {
    logger.log('Connected to database on ' + process.env.MONGO_URI);
    return next(null);
  });
  connection.on('error', function (error) {
    return next(error, connection);
  });
}

function models(next, data) {
  return next(null);
}

function validators(next, data) {
  var tv4 = require('tv4'), // Node module: https://github.com/geraintluff/tv4
      fs = require('fs');
  /**
   * Creates validator functions for input.
   * @param {String}   file     - The file path.
   * @param {Function} callback - The callback.
   */
  function validatorFactory(filePath, callback) {
    fs.readFile(filePath, 'utf8', function (err, file) {
      if (err) { callback(err, null); }
      /**
       * Validates the data based on the schema.
       * @param  {Object} data - The data to validate.
       * @return {Boolean}     - If it's valid.
       */
      function validate(data) {
        return tv4.validateResult(data, JSON.parse(file));
      }
      return callback(null, validate);
    });
  }
  async.parallel({
    // callbacks are implictly here
    item: _.partial(validatorFactory, './schema/item.json'),
    list: _.partial(validatorFactory, './schema/list.json')
  }, function finish(error, results) {
      next(error, results);
      // Results is [function validateItem(data), function validateList(data)]
  });
}

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

function complete(error, data) {
  if (error) { logger.error(error); throw error; }
  // No errors
  require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
    logger.success('Server listening on port ' + process.env.PORT);
  });
}
