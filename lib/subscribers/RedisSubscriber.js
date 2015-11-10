/*globals module, console */
var util = require('util'),
    Redis = require('redis'),
    EventEmitter = require('events');

(function() {
  'use strict';

  function RedisSubscriber(options) {
    this.opts = (options && options.redis) ? options.redis : {};

    EventEmitter.call(this);
  } // RedisSubscriber

  RedisSubscriber.prototype.bindListeners = function(client) {
    client.on('ready', function() {
      console.log('[ RedisSubscriber: connected ]');
      this.emit('connected');
    });

    client.on('error', function(error) {
      console.log(error);
    });

    client.on('psubscribe', function(room, count) {
      console.log('[ Subscription: ' + room + ' ]', 'Subscribed', count);
      this.emit('subscribed', room);
    });

    client.on('pmessage', function(room, channel, message) {
      console.log('[ Subscription: ' + room + ' ]', message);
      this.emit('message', room, message);
    });

    client.on('punsubscribed', function(room, count) {
      console.log('[ Subscription: ' + room + ' ]', 'Unsubscribed', count);
      this.emit('unsubscribed', room);
    });

    client.on('end', function() {
      console.log('[ RedisSubscriber: disconnected ]');
      this.emit('disconnected');
    });
  }; // bindListeners

  RedisSubscriber.prototype.subscribe = function(room) {
    console.log('[ Subscription: ' + room + ' ]', 'Subscribing');
    this.client.psubscribe(room);
  }; // subscribe

  RedisSubscriber.prototype.unsubscribe = function(room) {
    console.log('[ Subscription: ' + room + ' ]', 'Unsubscribing');
    this.client.punsubscribe(room);
  }; // unsubscribe

  RedisSubscriber.prototype.connect = function() {
    console.log('[ RedisSubscriber: connecting ]');
    this.client = Redis.createClient(this.opts.port || null, this.opts.host || null);
    this.bindListeners(this.client);
  }; // connect

  RedisSubscriber.prototype.quit = function() {
    console.log('[ RedisSubscriber: quitting ]');
    this.client.quit();
  }; // quit

  util.inherits(RedisSubscriber, EventEmitter);

  module.exports = RedisSubscriber;
}());
