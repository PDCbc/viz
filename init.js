'use strict';

var async = require('async'),
    logger = require('./lib/logger');

async.auto({
  environment:     environment,
  database:        [ 'environment', database ],
  certificate:     [ 'environment', certificate ],
  httpd:           [ 'environment', httpd ],
  models:          [ 'database', models ],
  auth:            [ 'models', 'httpd', auth ],
  routes:          [ 'auth', 'models', 'httpd', routes ]
}, complete);

function environment(callback) {
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
  // OAuth Stuff
  if (!process.env.REQUEST_TOKEN_URL) {
    logger.warn('No $REQUEST_TOKEN_URL present. Defaulting to `https://localhost:8080/oauth/request_token`.');
    process.env.REQUEST_TOKEN_URL = 'https://localhost:8080/oauth/request_token';
  }
  if (!process.env.ACCESS_TOKEN_URL) {
    logger.warn('No $ACCESS_TOKEN_URL present. Defaulting to `https://localhost:8080/oauth/access_token`.');
    process.env.ACCESS_TOKEN_URL = 'https://localhost:8080/oauth/access_token';
  }
  if (!process.env.USER_AUTHORIZATION_URL) {
    logger.warn('No $USER_AUTHORIZATION_URL present. Defaulting to `https://localhost:8080/oauth/authorize`.');
    process.env.USER_AUTHORIZATION_URL = 'https://localhost:8080/oauth/authorize';
  }
  if (!process.env.CALLBACK_URL) {
    logger.warn('No $CALLBACK_URL present. Defaulting to `https://localhost:8080/auth/callback`.');
    process.env.CALLBACK_URL = 'https://localhost:8080/auth/callback';
  }
  if (!process.env.CONSUMER_KEY) {
    logger.warn('No $CONSUMER_KEY present. Defaulting to `test`.');
    process.env.CONSUMER_KEY = 'test';
  }
  if (!process.env.CONSUMER_SECRET) {
    logger.warn('No $CONSUMER_SECRET present. Defaulting to `test`.');
    process.env.CONSUMER_SECRET = 'test';
  }
  return callback(null);
}

/**
 * Setup the SSL Certificates.
 * @param {Function} next - The callback.
 */
function certificate(next) {
  var fs = require('fs');
  // Get the certificates.
  async.auto({
    key:  function (next) { fs.readFile('cert/server.key', 'utf8', next); },
    cert: function (next) { fs.readFile('cert/server.crt', 'utf8', next); }
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
  function generateCertificate(error, results, next) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Tell Node it's okay.
    if (error && error.code === 'ENOENT') {
      logger.warn('No certificates present in `cert/{server.key, server.crt}`. Generating a temporary certificate.');
      require('pem').createCertificate({ days: 1, selfSigned: true }, function formatKey(error, keys) {
        if (error) { return next(error, null); }
        return next(null, {key: keys.serviceKey, cert: keys.certificate });
      });
    } else {
      return next(error, results);
    }
  }
}

function httpd(callback, data) {
  var server = require('express')(),
      passport = require('passport');
  // Set the server engine.
  server.set('view engine', 'hbs');
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
  server.use(require('serve-static')('site'));
  // Session store
  server.use(require('express-session')({
    secret: process.env.SECRET,
    cookie: { secure: true }
  }));
  // Passport middleware.
  server.use(passport.initialize());
  server.use(passport.session());
  // Protects against CSRF.
  // server.use(require('csurf')());
  // Compresses responses.
  server.use(require('compression')());
  return callback(null, server);
}

function database(callback, data) {
  var connection = require('mongoose').connect(process.env.MONGO_URI).connection;
  connection.on('open', function () {
    logger.log('Connected to database on ' + process.env.MONGO_URI);
    return callback(null);
  });
  connection.on('error', function (error) {
    return callback(error, connection);
  });
}

function models(callback, data) {
  return callback(null);
}

function auth(callback, data) {
  var passport = require('passport'),
      OAuth1Strategy = require('passport-oauth1');
  passport.use('oauth', new OAuth1Strategy({
      requestTokenURL: process.env.REQUEST_TOKEN_URL,
      accessTokenURL: process.env.ACCESS_TOKEN_URL,
      userAuthorizationURL: process.env.USER_AUTHORIZATION_URL,
      consumerKey: process.env.CONSUMER_KEY,
      consumerSecret: process.env.CONSUMER_SECRET,
      callbackURL: process.env.CALLBACK_URL
    },
    function verify(token, tokenSecret, profile, done) {
      // TODO: Actually verify.
      console.log('TODO: Verify called.');
      done(null, { key: token, secret: tokenSecret });
    }
  ));
  passport.serializeUser(function(token, done) {
    console.log('Serialize');
    return done(null, token);
  });
  passport.deserializeUser(function(id, done) {
    // TODO
    console.log('Deserialize');
    return done(null, id);
  });
  return callback(null);
}

function routes(callback, data) {
  var router = new require('express').Router(),
      ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
      ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut,
      passport = require('passport');
  router.get('/auth',
    passport.authenticate('oauth')
  );
  router.get('/auth/callback',
    passport.authenticate('oauth', { failureRedirect: '/fail' }),
    function (req, res) { res.redirect('/'); }
  );
  router.get('/fail', function (req, res) {
    res.send('You failed.');
  });

  // API Routes
  router.get('/api',
    ensureLoggedIn('/auth'),
    function (req, res) {
      var oauth = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        token: req.session.passport.user.key,
        token_secret: req.session.passport.user.secret
      };
      require('request').get({ url: 'https://queryengine:8080/api', oauth: oauth, json: true },
        function (error, request, body) {
          res.send(body);
        }
      );
    }
  );
  router.get('/api/:title',
    ensureLoggedIn('/auth'),
    function (req, res) {
      var oauth = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        token: req.session.passport.user.key,
        token_secret: req.session.passport.user.secret
      };
      require('request').get({ url: 'https://queryengine:8080/api/' + req.params.title, oauth: oauth, json: true },
        function (error, request, body) {
          // Need to join this data with the entry stored on the visualizer.
          res.send(body);
        }
      );
    }
  );
  // Attach the router.
  data.httpd.use(router);
  callback(null, router);
}

function complete(error, data) {
  if (error) { logger.error(error); throw error; }
  // No errors
  require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
    logger.success('Server listening on port ' + process.env.PORT);
  });
}
