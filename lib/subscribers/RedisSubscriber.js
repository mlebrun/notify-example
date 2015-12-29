/*globals module */
var util = require('util'),
    Redis = require('redis'),
    EventEmitter = require('events'),
    logger = require(__dirname + '/../logger');

(function() {
  'use strict';

  function RedisSubscriber(options) {
    this.opts = options || {};

    EventEmitter.call(this);
  } // RedisSubscriber

  RedisSubscriber.prototype.bindListeners = function(client) {
    client.on('error', function(error) {
      logger.error('[ Subscriber: Error ]', { error: error });
    });

    client.on('ready', function() {
      logger.debug('[ Subscriber: Connected ]');
      this.emit('connected');
    }.bind(this));

    client.on('psubscribe', function(room, count) {
      logger.debug('[ Subscriber: Subscribed ]', { room: room, count: count });
      this.emit('subscribed', room);
    }.bind(this));

    client.on('pmessage', function(room, channel, message) {
      logger.debug('[ Subscriber: Message ]', { room: room, message: message });
      this.emit('message', room, message);
    }.bind(this));

    client.on('punsubscribe', function(room, count) {
      logger.debug('[ Subscriber: Unsubscribed ]', { room: room, count: count });
      this.emit('unsubscribed', room);
    }.bind(this));

    client.on('end', function() {
      logger.debug('[ Subscriber: Disconnected ]');
      this.emit('disconnected');
    }.bind(this));
  }; // bindListeners

  RedisSubscriber.prototype.subscribe = function(room) {
    logger.debug('[ Subscriber: Subscribing ]', { room: room });
    this.client.psubscribe(room);
  }; // subscribe

  RedisSubscriber.prototype.unsubscribe = function(room) {
    logger.debug('[ Subscriber: Unsubscribing ]', { room: room });
    this.client.punsubscribe(room);
  }; // unsubscribe

  RedisSubscriber.prototype.connect = function() {
    logger.debug('[ Subscriber: Connecting ]');
    this.client = Redis.createClient(this.opts.port || null, this.opts.host || null);
    this.bindListeners(this.client);
  }; // connect

  RedisSubscriber.prototype.quit = function() {
    logger.debug('[ Subscriber: Disconnecting ]');
    this.client.quit();
  }; // quit

  util.inherits(RedisSubscriber, EventEmitter);

  module.exports = RedisSubscriber;
}());
