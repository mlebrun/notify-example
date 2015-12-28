/*globals __dirname, console, process */
var Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    logger = require(__dirname + '/logger'),
    primus;

(function() {
  'use strict';

  function Application(primus, subscriber) {

    this.subscriptions = [];

    primus.use('emit', Emit);
    primus.use('rooms', Rooms);

    this.bindListeners(primus, subscriber);

    subscriber.connect();

  } // Application

  Application.prototype.bindListeners = function(primus, subscriber) {
    subscriber.on('message', function(room, message) {
      logger.info('[ Application: ' + room + ' ]', message);
      var clients = primus.room(room).clients(),
          notification = JSON.parse(message);

      if (!notification || !notification.type === undefined) {
        throw new Error('Notification type undefined');
      }

      clients.forEach(function(client_id) {
        primus.spark(client_id).emit(notification.type, notification.data || {});
      });
    });

    subscriber.on('subscribed', function(room, channel, message) {
      logger.debug('[ Application: ' + room + ' ]', 'Subscribed');
      var subscription_id = this.subscriptions.indexOf(room);

      if (subscription_id === -1) {
        this.subscriptions.push(room);
      }
    }.bind(this));

    subscriber.on('unsubscribed', function(room, channel, message) {
      logger.debug('[ Application: ' + room + ' ]', 'Unsubscribed');
      var subscription_id = this.subscriptions.indexOf(room);

      if (subscription_id != -1) {
        delete this.subscriptions[subscription_id];
      }
    }.bind(this));

    primus.on('joinroom', function(room, spark) {
      logger.info('[ Spark: ' + spark.id + ' ] joined ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      spark.emit('subscribed', room);

      if (subscription_id === -1) {
        logger.debug('[ Application: ' + room + ' ]', 'Subscribing');
        subscriber.subscribe(room);
      }
    }.bind(this));

    primus.on('leaveroom', function(room, spark) {
      logger.info('[ Spark: ' + spark.id + ' ] left ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      spark.emit('unsubscribed', room);

      if (primus.isRoomEmpty(room) && subscription_id != -1) {
        logger.debug('[ Application: ' + room + ' ]', 'Unsubscribing');
        subscriber.unsubscribe(room);
      }
    }.bind(this));

    primus.on('leaveallrooms', function (rooms, spark) {
      logger.info('[ Spark: ' + spark.id + ' ] left all rooms', rooms);
    }.bind(this));

    primus.on('roomserror', function (error, spark) {
      logger.error('room error', spark.id, error);
    }.bind(this));

    primus.on('connection', function(spark) {
      logger.debug('[ Spark: ' + spark.id + ' ] connected');

      spark.on('subscribe', spark.join.bind(spark));
      spark.on('unsubscribe', spark.leave.bind(spark));
    });

    primus.on( 'disconnection', function(spark) {
      // Primus Rooms listens for the users disconnect and removes them
      // from all the rooms they joined, which automatically cleans up our subscribed keys.
      logger.debug('[ Spark: ' + spark.id + ' ] disconnected');
    });

    primus.on( 'close', function(spark) {
      // should clean up your subscriber
      subscriber.quit();
    });
  }; // bindListeners

  module.exports = Application;
}());
