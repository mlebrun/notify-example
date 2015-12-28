Example Notify Application
==========================

A realtime notification system built on [Primus](https://github.com/Primus/primus), [Engine.io](https://github.com/socketio/engine.io) and [Redis](https://github.com/NodeRedis/node_redis).


Getting Started
---------------

### Install

`git clone` the project

In the projects root, you can generate a test key and cert with:

`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout dev.key -out dev.crt`

```
npm install
node index
```
