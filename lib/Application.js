/*globals __dirname, console, process */
var Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    primus, logger;

(function() {
  'use strict';

  function Application(primus, subscriber) {

    this.subscriptions = [];

    primus.use('emit', Emit);
    primus.use('rooms', Rooms);

    this.bindListeners(primus, subscriber);

  } // Application

  Application.prototype.bindListeners = function(primus, subscriber) {
    subscriber.on('message', function(room, message) {
      primus.adapter().broadcast(message, { rooms: [ room ] }, primus.connections);
    });

    subscriber.on('subscribed', function(room, channel, message) {
      console.log('Client subscribed to ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      if (subscription_id === -1) {
        this.subscriptions.push(room);
      }
    }.bind(this));

    subscriber.on('unsubscribed', function(room, channel, message) {
      console.log('Client unsubscribed from ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      if (subscription_id != -1) {
        delete this.subscriptions[subscription_id];
      }
    }.bind(this));

    primus.on('joinroom', function(room, spark) {
      console.log(spark.id + ' joined ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      spark.emit('subscribed', room);

      if (subscription_id === -1) {
        subscriber.subscribe(room);
      }
    }.bind(this));

    primus.on('leaveroom', function(room, spark) {
      console.log(spark.id + ' left ' + room);
      var subscription_id = this.subscriptions.indexOf(room);

      spark.emit('unsubscribed', room);

      if (primus.isRoomEmpty(room) && subscription_id != -1) {
        console.log('Client unsubscribing from ' + room);
        subscriber.unsubscribe(room);
      }
    }.bind(this));

    primus.on('connection', function(spark) {
      console.log('[ Spark Connected ] ' + spark.id);

      spark.on('subscribe', spark.join.bind(spark));
      spark.on('unsubscribe', spark.leave.bind(spark));
    });

    primus.on( 'disconnection', function(spark) {
      // Primus Rooms listens for the users disconnect and removes them from all the rooms they joined,
      // which automatically cleans up our subscribed keys.
      console.log('[ Spark Disconnected ] ' + spark.id);
    });

    primus.on( 'close', function(spark) {
      // should clean up your subscriber
      subscriber.quit();
    });

  }; // bindListeners

  module.exports = Application;
}());
