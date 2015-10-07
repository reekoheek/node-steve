var loggers = {};

var logger = function(name) {
  'use strict';

  if (!loggers[name]) {
    loggers[name] = new Logger(name);
  }

  return loggers[name];
};

var date = function() {
  var d = new Date();
  return d.getTime();
};

var Logger = function(name) {
  'use strict';

  this.name = name;
};

Logger.prototype.log = function() {
  arguments[0] = 'L|' + date() + '|' + this.name + ' ' + arguments[0];
  console.log.apply(null, arguments);
};

Logger.prototype.error = function() {
  arguments[0] = 'E|' + date() + '|' + this.name + ' ' + arguments[0];
  console.error.apply(null, arguments);
};

module.exports = logger;