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

    this.bindToPrimus(primus);
    this.bindToSubscriber(primus, subscriber);

  } // Application

  /**
   * Returns stats about the current server.
   *
   * @return {Object}
   */
  Application.prototype.getStats = function() {

    return {
      subscriptions: this.getSubscriptions().length,
      clients: this.getClients().length,
      rooms: this.getRooms().length
    };

  };

  /**
   * Binds this class to Primus events
   */
  Application.prototype.bindToPrimus = function() {
    this.primus.on('joinroom', function(room, spark) {
      logger.info('[ Spark: Joined Room ]', { room: room, spark: spark.id });
      this.onRoomJoined(room, spark);
    }.bind(this));

    this.primus.on('leaveroom', function(room, spark) {
      logger.info('[ Spark: Left Room ]', { room: room, spark: spark.id });
      this.onRoomsLeft([ room ], spark);
    }.bind(this));

    this.primus.on('leaveallrooms', function (rooms, spark) {
      logger.info('[ Spark: Left All Rooms ]', { rooms: rooms, spark: spark.id });
      this.onRoomsLeft(rooms, spark);
    }.bind(this));

    this.primus.on('roomserror', function (error, spark) {
      logger.error('[ Rooms Error ]', { spark: spark.id, error: error });
    }.bind(this));

    this.primus.on('connection', function(spark) {
      logger.debug('[ Spark: Connected ]', { spark: spark.id });

      spark.on('subscribe', spark.join.bind(spark));
      spark.on('unsubscribe', spark.leave.bind(spark));
    });

    this.primus.on( 'disconnection', function(spark) {
      // Primus Rooms listens for the users disconnect and removes them from all the rooms they joined
      // (primus.on#leaveallrooms), which automatically cleans up our subscribed keys.
      logger.debug('[ Spark: Disconnected ]', { spark: spark.id });
    });
  };

  /**
   * Binds this class to Subscriber events
   */
  Application.prototype.bindToSubscriber = function() {
    this.subscriber.on('message', function(room, message) {
      logger.info('[ Application: Message ]', { room: room, message: message });
      this.onMessage(room, message);
    }.bind(this));

    this.subscriber.on('subscribed', function(room) {
      logger.debug('[ Application: Subscribed ]', { room: room });
      this.onSubscribe(room);
    }.bind(this));

    this.subscriber.on('unsubscribed', function(room) {
      logger.debug('[ Application: Unsubscribed ]', { room: room });
      this.onUnsubscribe(room);
    }.bind(this));
  };

  /**
   * Returns list of subscribed keys.
   *
   * @return {String[]}
   */
  Application.prototype.getSubscriptions = function() {
    return this.subscriptions;
  };

  /**
   * Returns list of current clients.
   *
   * @return {String[]}
   */
  Application.prototype.getClients = function() {
    return this.primus.adapter.clients();
  };

  /**
   * Returns list of current rooms.
   *
   * @return {String[]}
   */
  Application.prototype.getRooms = function() {
    return this.primus.rooms();
  };

  /**
   * Handles a message.
   *
   * @param  {String} room
   * @param  {String} message JSON string
   *   - `type` key required
   *   - `data` key optional, meta data
   */
  Application.prototype.onMessage = function(room, message) {
    var clients = this.primus.room(room).clients(),
        notification = JSON.parse(message);

    if (!notification || notification.type === undefined) {
      throw new Error('Notification type undefined');
    }

    clients.forEach(function(client_id) {
      this.primus.spark(client_id).emit(notification.type, notification.data || {});
    }, this);
  };

  /**
   * Handles successful subscription.
   *
   * @param  {String} room
   */
  Application.prototype.onSubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      this.subscriptions.push(room);
    }
  };

  /**
   * Handles unscrubing from a subscription.
   *
   * @param  {String} room
   */
  Application.prototype.onUnsubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id != -1) {
      delete this.subscriptions[subscription_id];
    }
  };

  /**
   * Subscribes to a room.
   *
   * @param  {String} room
   * @param  {Spark} spark
   */
  Application.prototype.onRoomJoined = function(room, spark) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      logger.debug('[ Application: Subscribing ]', { room: room });
      this.subscriber.subscribe(room);
    }
  };

  /**
   * Unsubscribes from a room.
   *
   * @param  {String} room
   * @param  {Spark} spark
   */
  Application.prototype.onRoomsLeft = function(rooms, spark) {
    rooms.forEach(function(room) {
      var subscription_id = this.subscriptions.indexOf(room);

      if (this.primus.isRoomEmpty(room) && subscription_id != -1) {
        logger.debug('[ Application: Unsubscribing ]', { room: room });
        this.subscriber.unsubscribe(room);
      }
    }, this);
  };

  module.exports = Application;
}());
