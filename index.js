/*globals __dirname, console, process */
var fs = require('fs'),
    https = require('https'),
    express = require('express'),
    Primus = require('primus'),
    Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    Notify = require('notify'),
    RedisSubscriber = require('./lib/subscribers/RedisSubscriber'),
    logger = require(__dirname + '/lib/logger'),
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
  logger.error('[ Rooms Error ]', { spark: spark.id, error: error });
});

primus
.use('emit', Emit)
.use('rooms', Rooms)
.use('notify', Notify);

// save latest client library
primus.save(__dirname +'/client.js');

process.on('SIGTERM', function () {
  server.close(function () {
    process.exit(0);
  });
});

primus.on('close', function(spark) {
  // should clean up your subscriber
  subscriber.quit();
});

subscriber.connect();
subscriber.on('connected', function() {
  server.listen(config.CFG_PRIMUS_PORT, function() {
    logger.info('[ Primus Listening ] ' + config.CFG_PRIMUS_PORT);
  });
});

