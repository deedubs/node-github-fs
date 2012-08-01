var request = require('superagent')
  , debug = require('debug')('github:fs')
  , githubBaseUri = 'https://api.github.com';

function GithubFS(repositoryName, options) {
  var gfs = this;

  gfs.repositoryName = repositoryName;
  gfs.options = options;

  gfs.urls = {
      trees: githubBaseUri + '/repos/' + gfs.repositoryName + '/git/trees'
    , commits: githubBaseUri + '/repos/' + gfs.repositoryName + '/git/commits'
    , refs: githubBaseUri + '/repos/' + gfs.repositoryName + '/git/refs/heads/master'
    , lastCommit: githubBaseUri + '/repos/' + gfs.repositoryName + '/commits?per_page=1'
  }
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

  this
    .realpath(filename, function (err, path) {
      var req = buildRequest('head', path, gfs.options)

      if(gfs.options.auth) {
        debug('Making authenticated request');
        req.auth(gfs.options.auth.username, gfs.options.auth.password)
      };

      req.end(function (res) {
        callback(res.statusCode === 200);
      });
    });
};

GithubFS.prototype.readFile = function (filename, callback) {
  var gfs = this;

  this
    .realpath(filename, function (err, path) {
      var req = buildRequest('get', path, gfs.options)
        .set('Accept', 'application/vnd.github.beta.raw+json');

      if(gfs.options.auth) {
        debug('Making authenticated request');
        req.auth(gfs.options.auth.username, gfs.options.auth.password)
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
  var gfs = this;

  this
    .realpath(dirname, function (err, path) {
      var req = buildRequest('get', path, gfs.options)
        .set('Accept', 'application/vnd.github.beta.raw+json');

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
    , req = buildRequest('get', this.urls.lastCommit, gfs.options);

  req.end(function (res) {
    if(res.statusCode >= 200 && res.statusCode < 300) {
      callback(null, res.body[0]);
    } else {
      callback(new Error(res.body.message));
    }
  });
}

GithubFS.prototype.writeFile = function (filename, content, callback) {
  var gfs = this;

  if(!gfs.options.auth) {
    return callback(new Error('options.auth is required'));
  }

  this.currentCommit(function(err, commitData) {
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
          .end(function (res) {
            var commitSha = res.body.sha
              , req = buildRequest('post', gfs.urls.refs, gfs.options);
  
            req
              .send({
                  sha: commitSha
                })
              .end(function (res) {
                if(res.statusCode >= 200 && res.statusCode < 300) {
                  callback();
                } else {
                  callback(new Error(res.body.message));
                }
              });
          });

      });
  });
};

module.exports = GithubFS;

function buildRequest(type, path, options) {
  var req = request[type](path);

  if(options.auth) {
    req.auth(options.auth.username, options.auth.password);
  }

  return req;    
}