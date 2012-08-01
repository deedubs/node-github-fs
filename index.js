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
      var req = buildRequest('head', path, options)

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
      var req = buildRequest('get', path, options)
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
      var req = buildRequest('get', path, options)
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
  var options = this.options
    , path = githubBaseUri + '/repos/' + this.repositoryName + '/commits?per_page=1';

  var req = buildRequest('get', path, options);

  req.end(function (res) {
    if(res.statusCode >= 200 && res.statusCode < 300) {
      callback(null, res.body[0]);
    } else {
      callback(new Error(res.body.message));
    }
  });
}

GithubFS.prototype.writeFile = function (filename, content, callback) {
  if(!this.options.auth) {
    return callback(new Error('options.auth is required'));
  }

  var treeUrl = githubBaseUri + '/repos/' + this.repositoryName + '/git/trees'
    , commitUrl = githubBaseUri + '/repos/' + this.repositoryName + '/git/commits'
    , refsUrl = githubBaseUri + '/repos/' + this.repositoryName + '/git/refs/heads/master'
    , options = this.options;

  this.currentCommit(function(err, commitData) {
    var currentTree = commitData.commit.tree.sha
      , currentSha = commitData.sha;
      
    request
      .post(treeUrl)
      .set('Accept', 'application/vnd.github.beta.raw+json')
      .auth(options.auth.username, options.auth.password)
      .send({
          base_tree: currentTree
        , tree: [{
              path: filename
            , type: 'blob'
            , mode: '100644'
            , content: content
          }]
      })
      .end(function (res) {
        var treeSha = res.body.sha;

        request
          .post(commitUrl)
          .set('Accept', 'application/vnd.github.beta.raw+json')
          .auth(options.auth.username, options.auth.password)
          .send({
              message: 'Commit from node-github-fs'
            , tree: treeSha
            , parents: [currentSha]
          })
          .end(function (res) {
            var commitSha = res.body.sha;
  
            request
              .patch(refsUrl)
              .set('Accept', 'application/vnd.github.beta.raw+json')
              .auth(options.auth.username, options.auth.password)
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

function buildRequest(type, path, options, callback) {
  var req = request[type](path);

  if(options.auth) {
    req.auth(options.auth.username, options.auth.password);
  }

  return req;    
}