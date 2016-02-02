/*globals __dirname, console, process */
var debug = require('debug')('notify:Application');

(function() {
  'use strict';

  function Application(container) {
    this.services = container;

    this._configureErrorHandling();
    this._configureSignals();
  }

  /**
   * Starts the app.
   */
  Application.prototype.run = function() {
    var redis = this.services.get('redis'),
        server = this.services.get('server'),
        config = this.services.get('config');

    redis.on('ready', function() {
      debug('[ Redis Connected ] ' + config.CFG_REDIS_HOST + ':' + config.CFG_REDIS_PORT);

      server.listen(config.CFG_SERVER_PORT, function() {
        debug('[ Server Listening ] ' + config.CFG_SERVER_PORT);
      });
    });
  };

  /**
   * Listens for errors from services.
   */
  Application.prototype._configureErrorHandling = function() {
    var primus = this.services.get('primus');

    primus.on('roomserror', function (error, spark) {
      debug('[ Rooms Error ]', { spark: spark.id, error: error });
    });
  };

  /**
   * Listens for signals sent to process.
   */
  Application.prototype._configureSignals = function() {
    var redis = this.services.get('redis'),
        primus = this.services.get('primus'),
        process = this.services.get('process');

    process.on('SIGTERM', function () {
      debug('[ SIGTERM ]', 'Shutting down server');

      primus.destroy({ timeout: 10000 });

      // clean up connected Sparks
      primus.forEach(function(spark, next) {
        spark.end();
        next();
      }, function() {
        // disconnect from Redis
        redis.quit();
        process.exit(0);
      });
    });
  };

  module.exports = Application;
}());
