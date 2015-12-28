/*globals __dirname, console, process */
var fs = require('fs'),
    https = require('https'),
    express = require('express'),
    Primus = require('primus'),
    Rooms = require('primus-rooms'),
    RedisSubscriber = require('./lib/subscribers/RedisSubscriber'),
    Application = require('./lib/Application'),
    logger = require(__dirname + '/lib/logger'),
    config = process.env,
    server, primus, app;

server = https.createServer({
  key: fs.readFileSync(config.CFG_PRIMUS_PATH_KEY),
  cert: fs.readFileSync(config.CFG_PRIMUS_PATH_CERT),
  requestCert: true,
  rejectUnauthorized: false
}, express());

primus = new Primus(server, {
  transformer: config.CFG_PRIMUS_TRANSFORMER,
  origins: 'https://net.dev.be.lan'
});

subscriber = new RedisSubscriber({
  port: config.CFG_REDIS_PORT,
  host: config.CFG_REDIS_HOST
});
application = new Application(primus, subscriber);

// save latest client library
primus.save(__dirname +'/client.js');

process.on('SIGTERM', function () {
  server.close(function () {
    process.exit(0);
  });
});

server.listen(config.CFG_PRIMUS_PORT, function() {
  logger.info('[ Primus Listening ] ' + config.CFG_PRIMUS_PORT);
});
