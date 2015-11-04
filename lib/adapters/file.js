// jshint esnext: true

var path = require('path');
var uuid = require('node-uuid');
var chokidar = require('chokidar');
var co = require('co');
var fs = require('../fs');
var ao = require('../ao');
var logger = require('../logger');
var log = logger('adapter/file');

module.exports = function() {
  'use strict';

  return {
    configure: function() {
      this.options.spoolDir = this.options.spoolDir || './spool';

      this.spool = {};

      this.spool[this.SPOOL_PENDING] = [false, path.join(this.options.spoolDir, this.SPOOL_PENDING)];
      this.spool[this.SPOOL_ONGOING] = [false, path.join(this.options.spoolDir, this.SPOOL_ONGOING)];
      this.spool[this.SPOOL_DONE] = [false, path.join(this.options.spoolDir, this.SPOOL_DONE)];
      this.spool[this.SPOOL_RECURRENCE] = [false, path.join(this.options.spoolDir, this.SPOOL_RECURRENCE)];

      this._prepareDir(this.SPOOL_PENDING);
      this._prepareDir(this.SPOOL_ONGOING);
      this._prepareDir(this.SPOOL_DONE);
      this._prepareDir(this.SPOOL_RECURRENCE);
    },

    getNamespaces: function() {
      if (!this.namespaces) {
        this.namespaces = ['default'];
      }
      return this.namespaces;
    },

    nextQueuedId: function*(namespace) {
      try {
        var ongoing = yield fs.readdir(path.join(this.spool[this.SPOOL_ONGOING][1], namespace));
        if (ongoing.length >= this.options.maxConcurrentProcess) {
          return;
        }
      } catch(e) {
      }

      try {

        var files = yield fs.readdir(path.join(this.spool[this.SPOOL_PENDING][1], namespace));
        return files[0] || null;
      } catch(e) {
        return;
      }
    },

    // start: function() {
    //   var spoolO = this.spool[this.SPOOL_PENDING];

    //   chokidar.watch(spoolO[1], {
    //     ignored: /[\/\\]\./,
    //     awaitWriteFinish: true,
    //   }).on('add', function(filePath) {
    //     var id = path.basename(filePath);
    //     co(function *() {
    //       try {
    //         yield this.process(id);
    //       } catch(e) {
    //         log.error(e.stack);
    //       }
    //     }.bind(this));
    //   }.bind(this));
    // },

    fetch: function(spool, id, namespace) {
      var filePath = path.join(this.spool[spool][1], namespace, id);

      return co(function *() {
        var lines = yield fs.readFile(filePath);
        var data;
        try {
          data = JSON.parse(lines);
          if (!data || !data.cmd || !data.args || !data.id) {
            throw new Error('Unrecoverable data');
          }

          if (data.id !== id) {
            throw new Error('Mismatch id, maybe misplaced data');
          }
        } catch(e) {
          log.error('Cannot parse data, with message: ' + e.message);
          data = null;
        }
        yield fs.unlink(filePath);
        return data;
      });
    },

    add: function(spool, job) {
      return co(function *() {
        job = ao.mixin({
          id: job.id || uuid.v1(),
          ns: 'default'
        }, job);

        var spoolO = this.spool[spool] || null;

        if (typeof this.spool[spool] === 'undefined') {
          throw new Error('Spool not found, ' + spool);
        }

        var spoolDir = yield this._prepareDir(spool);
        var lines = JSON.stringify(job, null, 2);

        if (this.namespaces.indexOf(job.ns) === -1) {
          this.namespaces.push(job.ns);
        }

        yield fs.mkdir(path.join(spoolDir, job.ns));

        return fs.writeFile(path.join(spoolDir, job.ns, job.id), lines);
      }.bind(this));
    },

    _prepareDir: function(spool) {
      var spoolO = this.spool[spool];
      return co(function *() {
        yield fs.mkdir(spoolO[1]);
        spoolO[0] = true;
        return spoolO[1];
      });
    },
  };
};
