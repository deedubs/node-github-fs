var request = require('superagent')
  , githubBaseUri = 'https://api.github.com';

function GithubFS(repositoryName) {
  this.repositoryName = repositoryName;
}

GithubFS.prototype.realpath = function (path, cache, callback) {
  if (typeof(cache) === 'function') {
    callback = cache;
    cache = null;
  }

  callback(null, githubBaseUri + '/repos/' + this.repositoryName + '/contents/' + path);
};

GithubFS.prototype.exists = function (filename, callback) {
  this
    .realpath(filename, function (err, path) {
      request
        .head(path)
        .end(function (res) {
          callback(res.statusCode === 200);
        });
    });
};

GithubFS.prototype.readFile = function (filename, callback) {
  this
    .realpath(filename, function (err, path) {
      request
        .get(path)
        .set('Accept', 'application/vnd.github.beta.raw+json')
        .end(function (res) {
          if (res.statusCode === 200) {
            callback(null, res.text);
          } else {
            callback(new Error(res.body));
          }
        });
    });
};

GithubFS.prototype.readdir = function (dirname, callback) {
  this
    .realpath(dirname, function (err, path) {
      request
        .get(path)
        .set('Accept', 'application/vnd.github.beta.raw+json')
        .end(function (res) {
          if (res.statusCode === 200) {
            callback(null, res.body);
          } else {
            callback(new Error(res.body));
          }
        });
    });
};

module.exports = GithubFS;