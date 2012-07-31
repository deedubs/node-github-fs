var request = require('superagent')
  , debug = require('debug')('github:fs')
  , githubBaseUri = 'https://api.github.com';

function GithubFS(repositoryName, options) {
  this.repositoryName = repositoryName;
  this.options = options;
}

GithubFS.prototype.realpath = function (path, cache, callback) {
  if (typeof(cache) === 'function') {
    callback = cache;
    cache = null;
  }

  callback(null, githubBaseUri + '/repos/' + this.repositoryName + '/contents/' + path);
};

GithubFS.prototype.exists = function (filename, callback) {
  var options = this.options;

  this
    .realpath(filename, function (err, path) {
      var req = request
        .head(path);

      if(options.auth) {
        debug('Making authenticated request');
        req.auth(options.auth.username, options.auth.password)
      };

      req.end(function (res) {
        callback(res.statusCode === 200);
      });
    });
};

GithubFS.prototype.readFile = function (filename, callback) {
  var options = this.options;

  this
    .realpath(filename, function (err, path) {
      var req = request
        .get(path)
        .set('Accept', 'application/vnd.github.beta.raw+json');

      if(options.auth) {
        debug('Making authenticated request');
        req.auth(options.auth.username, options.auth.password)
      };

      req.end(function (res) {
        if (res.statusCode === 200) {
          callback(null, res.text);
        } else {
          callback(new Error(res.body));
        }
      });
    });
};

GithubFS.prototype.readdir = function (dirname, callback) {
  var options = this.options;

  this
    .realpath(dirname, function (err, path) {
      var req = request
        .get(path)
        .set('Accept', 'application/vnd.github.beta.raw+json');

      if(options.auth) {
        debug('Making authenticated request');
        req.auth(options.auth.username, options.auth.password)
      };

      req.end(function (res) {
        if (res.statusCode === 200) {
          callback(null, res.body);
        } else {
          callback(new Error(res.body));
        }
      });
    });
};

module.exports = GithubFS;