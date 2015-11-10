/*globals __dirname, console, process */
var http = require('http'),
    express = require('express'),
    Primus = require('primus'),
    Rooms = require('primus-rooms'),
    Notify = require('notify'),
    RedisSubscriber = require('./lib/subscribers/RedisSubscriber'),
    Application = require('./lib/Application'),
    config = process.env,
    server, primus, app, logger;

server = require('http').createServer(express());
primus = new Primus(server, { transformer: config.CFG_PRIMUS_TRANSFORMER });

subscriber = new RedisSubscriber({ redis: { port: config.CFG_REDIS_PORT, host: config.CFG_REDIS_HOST } });
application = new Application(primus, subscriber);

subscriber.connect();

server.listen(config.CFG_PRIMUS_PORT, function() {
  console.log('Listening on: ' + config.CFG_PRIMUS_PORT);
});