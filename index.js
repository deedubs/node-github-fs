var request = require('superagent')
  , debug = require('debug')('github:fs')
  , githubBaseUri = 'https://api.github.com';

function GithubFS(repositoryName, options) {
  var gfs = this;

  gfs.repositoryName = repositoryName;
  gfs.options = options;
  gfs.baseUrl = githubBaseUri + '/repos/' + gfs.repositoryName;
  
  gfs.urls = {
      trees: gfs.baseUrl + '/git/trees'
    , commits: gfs.baseUrl + '/git/commits'
    , refs: gfs.baseUrl + '/git/refs/heads/master'
    , lastCommit: gfs.baseUrl + '/commits?per_page=1'
  };
}

GithubFS.prototype.realpath = function (path, cache, callback) {
  if (typeof(cache) === 'function') {
    callback = cache;
    cache = null;
  }

  callback(null, githubBaseUri + '/repos/' + this.repositoryName + '/contents/' + path);
};

GithubFS.prototype.exists = function (filename, callback) {
  var gfs = this;

  gfs
    .realpath(filename, function (err, path) {
      var req = buildRequest('head', path, gfs.options);

      req.end(function (res) {
        callback(res.statusCode === 200);
      });
    });
};

GithubFS.prototype.readFile = function (filename, callback) {
  var gfs = this;

  gfs
    .realpath(filename, function (err, path) {
      var req = buildRequest('get', path, gfs.options);

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
  var gfs = this;

  gfs
    .realpath(dirname, function (err, path) {
      var req = buildRequest('get', path, gfs.options);

      req.end(function (res) {
        if (res.statusCode === 200) {
          callback(null, res.body);
        } else {
          callback(new Error(res.body));
        }
      });
    });
};

GithubFS.prototype.currentCommit = function (callback) {
  var gfs = this
    , req = buildRequest('get', gfs.urls.lastCommit, gfs.options);

  req.end(function (res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      callback(null, res.body[0]);
    } else {
      callback(new Error(res.body.message));
    }
  });
};

GithubFS.prototype.writeFile = function (filename, content, callback) {
  var gfs = this;

  if (!gfs.options.auth) {
    return callback(new Error('options.auth is required'));
  }

  function finalize(res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      callback();
    } else {
      callback(new Error(res.body.message));
    }
  }

  function buildReference(res) {
    var commitSha = res.body.sha
      , req = buildRequest('post', gfs.urls.refs, gfs.options);

    req
      .send({ sha: commitSha })
      .end(finalize);
  }

  gfs.currentCommit(function buildCommit(err, commitData) {
    var currentTree = commitData.commit.tree.sha
      , currentSha = commitData.sha
      , req = buildRequest('post', gfs.urls.trees, gfs.options);
      
    req.send({
          base_tree: currentTree
        , tree: [{
              path: filename
            , type: 'blob'
            , mode: '100644'
            , content: content
          }]
      })
      .end(function (res) {
        var treeSha = res.body.sha
          , req = buildRequest('post', gfs.urls.commits, gfs.options);

        req
          .send({
              message: 'Commit from node-github-fs'
            , tree: treeSha
            , parents: [currentSha]
          })
        .end(buildReference);
      });
  });
};

module.exports = GithubFS;

function buildRequest(type, path, options) {
  var req = request[type](path);

  if (options.auth) {
    req.auth(options.auth.username, options.auth.password);
  }

  return req;
}