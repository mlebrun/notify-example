var fs = require('fs'),
    https = require('https'),
    express = require('express'),
    Pimple = require('pimple'),
    Primus = require('primus'),
    Notify = require('notify'),
    Redis = require('redis'),
    SubscriberAdapter = require('notify-redis-subscriber'),
    services = new Pimple();

(function() {
  'use strict';

  services.set('process', services.share(function () {
    return process;
  }));

  services.set('config', services.share(function(container) {
    return container.get('process').env;
  }));

  services.set('redis', services.share(function(container) {
    var config = container.get('config');

    return Redis.createClient(config.CFG_REDIS_PORT || null, config.CFG_REDIS_HOST || null);
  }));

  services.set('server', services.share(function(container) {
    var config = container.get('config');

    return https.createServer({
      key: fs.readFileSync(config.CFG_SERVER_PATH_KEY),
      cert: fs.readFileSync(config.CFG_SERVER_PATH_CERT),
      rejectUnauthorized: false,
      requestCert: true
    }, express());
  }));

  services.set('primus', services.share(function(container) {
    var config = container.get('config'),
        server = container.get('server'),
        subscriber = container.get('subscriber'),
        primus;

    primus = new Primus(server, {
      subscriber: subscriber,
      transformer: config.CFG_PRIMUS_TRANSFORMER,
      origins: config.CFG_SERVER_ORIGINS,
    });

    primus.use('notify', Notify);

    // save latest client library
    primus.save(__dirname +'/../client.js');

    return primus;
  }));

  services.set('subscriber', services.share(function(container) {
    return new SubscriberAdapter(container.get('redis'));
  }));

  module.exports = services;
}());