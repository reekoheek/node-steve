// jshint esnext: true

var logger = require('./logger');
var ao = require('./ao');
var co = require('co');
var spawn = require('child_process').spawn;

var appLog = logger('app');

var Steve = function(options) {
  'use strict';

  if (!(this instanceof Steve)) {
    return new Steve(options);
  }

  options = ao.defaults(options, {
    hostname: '0.0.0.0',
    port: 3000,
    adapter: require('./adapters/file')(),
    autoStart: true,
  });

  var _server;
  Object.defineProperties(this, {
    options: {
      enumerable: false,
      writable: false,
      configurable: false,
      value: options
    },
    server: {
      enumerable: false,
      get: function() {
        if (!_server) {
          _server = require('http').createServer(this.callback());
        }
        return _server;
      }
    }
  });

  if (this.options.adapter) {
    ao.extend(this, this.options.adapter);
  }

  this.configure();

  if (this.options.autoStart) {
    this.start();
  }
};

// jobs
Steve.prototype.SPOOL_PENDING = 'pending';
Steve.prototype.SPOOL_ONGOING = 'ongoing';
Steve.prototype.SPOOL_DONE = 'done';
Steve.prototype.SPOOL_RECURRENCE = 'recurrence';

Steve.prototype.fetch = function(spool, id) {
  'use strict';

  throw new Error('Unimplemented yet!');
};

Steve.prototype.add = function(spool, job) {
  'use strict';

  throw new Error('Unimplemented yet!');
};

Steve.prototype.configure = function(options) {
  'use strict';

  throw new Error('Unimplemented yet!');
};

Steve.prototype.start = function() {
  'use strict';

  var next = function() {
    co(function *() {
      try {
        var id = yield this.nextQueuedId();
        while (id) {
          yield this.process(id);
          id = yield this.nextQueuedId();
        }
      } catch(e) {
      }
      setTimeout(next, 1000 * 5);
    }.bind(this));
  }.bind(this);

  setTimeout(next);
};

Steve.prototype.process = function(id) {
  'use strict';

  return co(function *() {
    var job = yield this.fetch(this.SPOOL_PENDING, id);
    if (!job) {
      return;
    }
    yield this.add(this.SPOOL_ONGOING, job);
    yield this.exec(job);
    job = yield this.fetch(this.SPOOL_ONGOING, id);
    if (!job) {
      return;
    }
    yield this.add(this.SPOOL_DONE, job);
  }.bind(this));
};

Steve.prototype.exec = function(job) {
  'use strict';

  return new Promise(function(resolve, reject) {
    console.log('[JS] Executing %s ...', job.id);
    var exec = spawn(job.cmd, job.args);

    exec.stdout.on('data', function(data) {
      data.toString().trim().split('\n').forEach(function(line) {
        console.log('I %s> %s', job.id, line.trim());
      });
    });

    var chunks = [];

    exec.stderr.on('data', function(lines) {
      chunks.push(lines);
    });

    exec.on('close', function(code, signal) {
      var errors = [];
      var actions = [];

      Buffer.concat(chunks).toString().split('\n').forEach(function(message) {
        message = message.trim();

        if (message[0] === '!') {
          var splitted = message.split(' ');
          actions.push({
            action: splitted[0],
            data: JSON.parse(splitted.slice(1).join(' '))
          });
        } else {
          errors.push(message);
        }
      }.bind(this));

      if (code === 0) {
        actions.forEach(function(action) {
          if (action.action === '!add') {
            // console.log('[JS] added new job', action.data);
            this.add(this.SPOOL_PENDING, action.data);
          }
        }.bind(this));

        resolve();
      } else {
        errors.forEach(function(error) {
          console.error('E %s> %s', job.id, error);
        });
        reject(new Error('Error caught with code: ' + code));
      }
    }.bind(this));
  }.bind(this));
};

Steve.prototype.schedule = function(job) {
  'use strict';

  job = ao.defaults(job, {
    recurrence: 'once'
  });

  if (job.recurrence !== 'once') {
    this.add(this.SPOOL_RECURRENCE, job);
  }

  return this.add(this.SPOOL_PENDING, job);
};

// server

Steve.prototype.listen = function(callback) {
  'use strict';

  this.server.listen(this.options.port, this.options.hostname, function() {
    appLog.log('Listening on %s:%s', this.server.address().address, this.server.address().port);

    if (callback) {
      callback.apply(null, arguments);
    }
  }.bind(this));
};

Steve.prototype.callback = function() {
  'use strict';

  // TODO please change this to bonojs
  return function(request, response) {
    appLog.log('%s %s', request.method, request.url);

    response.writeHead(404, 'Not Found');
    response.write('Oops...\n');
    response.end();
  };
};

module.exports = Steve;