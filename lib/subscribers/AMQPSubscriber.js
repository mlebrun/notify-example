/*globals module, console */
/*jslint newcap: true */
var q    = require('q'),
    amqp = require('amqp');

(function() {
  'use strict';

  var subscribed = {};

  function Publisher( config, notify ) {
    var opts      = config.rabbitmq || {},
        amqp_opts = opts.amqp_options || {};

    this.primus = notify.primus;
    this.client = amqp.createConnection( opts, amqp_opts );
  } // Publisher

  Publisher.prototype.subscribe = function( key ) {
    // check if we're already subscribed
    if ( subscribed[ key ] ) {
      return q(true);
    }

    var primus = this.primus,
        client = this.client,
        queue;

    // connect to exchange
    return q.ninvoke( client, 'exchange', 'notifications', {
      type       : 'topic',
      autoDelete : true
    } )
    .then(function( exchange ) {
      // connect queue (returning only for the .then scope)
      return q.ninvoke( client, 'queue', null, {
        'exlusive' : true
      } )
      .then(function( queue ) {
        queue.bind( exchange, key );

        queue.on( 'error', console.warn );

        queue.subscribe(function( qkey, channel, message ) {

          console.log( '[ Room: ' + qkey + ' ]', message );
          primus.adapter().broadcast( message, { rooms: [ qkey ] } );

        }); // client.subscribe
      });
    })
    // keep track of key
    .then(function() {
      subscribed[ key ] = queue;
      return key;
    })
    .catch(console.warn);

  }; // subscribe

  Publisher.prototype.unsubscribe = function( key ) {

    var queue = subscribed[ key ],
        promise;

    if ( !queue ) {
      return q(true);
    }

    q.ninvoke( queue, 'destroy', key )
    .then(function() {
      subscribed.splice( subscribed.indexOf( key ) );
    });

    return promise;
  }; // unsubscribe

  Publisher.prototype.ready = function() {
    return q.ninvoke( this.client, 'on', 'ready' );
  }; // ready

  Publisher.prototype.quit = function() {
    return q.ninvoke( this.client, 'end' );
  }; // quit

  module.exports = Publisher;

}());
