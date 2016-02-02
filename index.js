/*globals __dirname, console, process */
var debug = require('debug')('notify:ExampleApp'),
    services = require('./lib/Services'),
    Application = require('./lib/Application'),
    app;

app = new Application(services);
app.run();