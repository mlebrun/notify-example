/*globals __dirname, console, process */
var fs = require('fs'),
    https = require('https'),
    debug = require('debug')('notify:ExampleApp'),
    express = require('express'),
    Primus = require('primus'),
    Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    Notify = require('notify'),
    RedisSubscriber = require('notify-redis-subscriber'),
    config = process.env,
    server, primus, app;

server = https.createServer({
  key: fs.readFileSync(config.CFG_PRIMUS_PATH_KEY),
  cert: fs.readFileSync(config.CFG_PRIMUS_PATH_CERT),
  requestCert: true,
  rejectUnauthorized: false
}, express());

subscriber = new RedisSubscriber({
  port: config.CFG_REDIS_PORT,
  host: config.CFG_REDIS_HOST
});

primus = new Primus(server, {
  subscriber: subscriber,
  transformer: config.CFG_PRIMUS_TRANSFORMER,
  origins: config.CFG_PRIMUS_ORIGINS,
});

primus.on('roomserror', function (error, spark) {
  debug('[ Rooms Error ]', { spark: spark.id, error: error });
});

primus
.use('emit', Emit)
.use('rooms', Rooms)
.use('notify', Notify);

// save latest client library
primus.save(__dirname +'/client.js');

process.on('SIGTERM', function () {
  debug('[ SIGTERM ]', 'Shutting down server');

  primus.destroy({ timeout: 10000 });

  // clean up any leftover sparks
  primus.forEach(function(spark, next) {
    spark.end();
    next();
  }, function() {
    // clean up subscriber
    subscriber.quit();
    process.exit(0);
  });
});

subscriber.connect();
subscriber.on('connected', function() {
  server.listen(config.CFG_PRIMUS_PORT, function() {
    debug('[ Primus Listening ] ' + config.CFG_PRIMUS_PORT);
  });
});

