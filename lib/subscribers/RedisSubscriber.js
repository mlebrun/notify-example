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
      logger.error('subscriber error', error);
    });

    client.on('ready', function() {
      logger.info('[ Subscriber: connected ]');
      this.emit('connected');
    }.bind(this));

    client.on('psubscribe', function(room, count) {
      logger.debug('[ Subscriber: ' + room + ' ]', 'Subscribed', count);
      this.emit('subscribed', room);
    }.bind(this));

    client.on('pmessage', function(room, channel, message) {
      logger.debug('[ Subscriber: ' + room + ' ]', message);
      this.emit('message', room, message);
    }.bind(this));

    client.on('punsubscribed', function(room, count) {
      logger.debug('[ Subscriber: ' + room + ' ]', 'Unsubscribed', count);
      this.emit('unsubscribed', room);
    }.bind(this));

    client.on('end', function() {
      logger.debug('[ Subscriber: disconnected ]');
      this.emit('disconnected');
    }.bind(this));
  }; // bindListeners

  RedisSubscriber.prototype.subscribe = function(room) {
    logger.debug('[ Subscriber: ' + room + ' ]', 'Subscribing');
    this.client.psubscribe(room);
  }; // subscribe

  RedisSubscriber.prototype.unsubscribe = function(room) {
    logger.debug('[ Subscriber: ' + room + ' ]', 'Unsubscribing');
    this.client.punsubscribe(room);
  }; // unsubscribe

  RedisSubscriber.prototype.connect = function() {
    logger.debug('[ Subscriber: connecting ]');
    this.client = Redis.createClient(this.opts.port || null, this.opts.host || null);
    this.bindListeners(this.client);
  }; // connect

  RedisSubscriber.prototype.quit = function() {
    logger.debug('[ Subscriber: quitting ]');
    this.client.quit();
  }; // quit

  util.inherits(RedisSubscriber, EventEmitter);

  module.exports = RedisSubscriber;
}());
