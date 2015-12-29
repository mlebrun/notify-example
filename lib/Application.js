/*globals __dirname, console, process */
var Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    logger = require(__dirname + '/logger'),
    primus;

(function() {
  'use strict';

  function Application(primus, subscriber) {

    this.subscriptions = [];
    this.subscriber    = subscriber;
    this.primus        = primus;

    primus.use('emit', Emit);
    primus.use('rooms', Rooms);

    this.bindListeners(primus, subscriber);

  } // Application

  Application.prototype.bindListeners = function(primus, subscriber) {
    subscriber.on('message', function(room, message) {
      logger.info('[ Application: Message ]', { room: room, message: message });
      this.onMessage(room, message);
    }.bind(this));

    subscriber.on('subscribed', function(room) {
      logger.debug('[ Application: Subscribed ]', { room: room });
      this.onSubscribe(room);
    }.bind(this));

    subscriber.on('unsubscribed', function(room) {
      logger.debug('[ Application: Unsubscribed ]', { room: room });
      this.onUnsubscribe(room);
    }.bind(this));

    primus.on('joinroom', function(room, spark) {
      logger.info('[ Spark: Joined Room ]', { room: room, spark: spark.id });
      this.subscribe(room, spark);
    }.bind(this));

    primus.on('leaveroom', function(room, spark) {
      logger.info('[ Spark: Left Room ]', { room: room, spark: spark.id });
      this.unsubscribe([ room ], spark);
    }.bind(this));

    primus.on('leaveallrooms', function (rooms, spark) {
      logger.info('[ Spark: Left All Rooms ]', { rooms: rooms, spark: spark.id });
      this.unsubscribe(rooms, spark);
    }.bind(this));

    primus.on('roomserror', function (error, spark) {
      logger.error('[ Rooms Error ]', { spark: spark.id, error: error });
    }.bind(this));

    primus.on('connection', function(spark) {
      logger.debug('[ Spark: Connected ]', { spark: spark.id });

      spark.on('subscribe', spark.join.bind(spark));
      spark.on('unsubscribe', spark.leave.bind(spark));
    });

    primus.on( 'disconnection', function(spark) {
      // Primus Rooms listens for the users disconnect and removes them from all the rooms they joined
      // (primus.on#leaveallrooms), which automatically cleans up our subscribed keys.
      logger.debug('[ Spark: Disconnected ]', { spark: spark.id });
    });

    primus.on( 'close', function(spark) {
      // should clean up your subscriber
      subscriber.quit();
    });
  }; // bindListeners

  Application.prototype.subscribe = function(room, spark) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      logger.debug('[ Application: Subscribing ]', { room: room });
      subscriber.subscribe(room);
    }
  };

  Application.prototype.unsubscribe = function(rooms, spark) {
    rooms.forEach(function(room) {
      var subscription_id = this.subscriptions.indexOf(room);

      if (this.primus.isRoomEmpty(room) && subscription_id != -1) {
        logger.debug('[ Application: Unsubscribing ]', { room: room });
        this.subscriber.unsubscribe(room);
      }
    }, this);
  };

  Application.prototype.onMessage = function(room, message) {
    var clients = this.primus.room(room).clients(),
        notification = JSON.parse(message);

    if (!notification || notification.type === undefined) {
      throw new Error('Notification type undefined');
    }

    clients.forEach(function(client_id) {
      this.primus.spark(client_id).emit(notification.type, notification.data || {});
    }.bind(this));
  };

  Application.prototype.onSubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      this.subscriptions.push(room);
    }
  };

  Application.prototype.onUnsubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id != -1) {
      delete this.subscriptions[subscription_id];
    }
  };

  module.exports = Application;
}());
