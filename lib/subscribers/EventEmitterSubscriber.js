/*globals module, console */
var q = require('q');

(function() {
  'use strict';

  function Publisher( primus, options ) {
    this.primus = primus;
    this.config = options;
  } // Publisher

  Publisher.prototype.subscribe = function( room ) {
    var publisher = this,
        emitter   = publisher.config.emitter;

    emitter.on( room, function( msg ) {

      console.log( '[ Room: ' + room + ' ]', msg );
      publisher._send( room, msg );

    }); // emitter.on [room]
  }; // subscribe

  Publisher.prototype.unsubscribe = function( room ) {
    var emitter = this.config.emitter;

    emitter.removeAllListeners( room );
  }; // unsubscribe

  Publisher.prototype._send = function( room, msg ) {
    var primus = this.primus;

    primus.adapter().broadcast( msg, { rooms: [ room ] }, primus.connections );
  }; // quit

  // since we're just using the underlying express
  // app, as long as our primus served is closed
  // then this publisher should be closed and vice versa
  Publisher.prototype.connect = function() {
    return q(true);
  }; // ready

  Publisher.prototype.quit = function() {
    this.config.emitter.removeAllListeners();
    return q(true);
  }; // quit

  module.exports = Publisher;

}());
