var winston = require('winston'),
    config = process.env,
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({ level: config.CFG_LOG_LEVEL }),
        new (winston.transports.File)({ level: 'error', filename: 'error.log' })
      ]
    });

logger.setLevels(winston.config.syslog.levels);

module.exports = logger;
