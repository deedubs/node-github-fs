var expect = require('expect.js')
  , GithubFS = require('../')
  , authData = require('./auth');

describe('GithubFS', function () {
  before(function() {
    this.gfs = new GithubFS('deedubs/test-repo', {auth: authData});
  });

  it('.rename');
  
  it('.stat');
  
  it('.unlink');
  
  it('.rmdir');
  
  it('.mkdir');
  
  it('.readdir', function (done) {
    var gfs = this.gfs;

    gfs.readdir('', function (err, dirListing) {
      expect(dirListing).to.be.an(Array);
      expect(dirListing[0]).to.have.property('name');
      expect(dirListing[0]).to.have.property('path');
      expect(dirListing[0]).to.have.property('size');
      done();
    });    
  });
  
  it('.exists', function (done) {
    var gfs = this.gfs;

    gfs.exists('README.md', function (exists) {
      expect(exists).to.be.ok();
      done();
    });
  });
  
  it('.readFile', function (done) {
    var gfs = this.gfs;

    gfs.readFile('README.md', function (err, contents) {
      expect(contents).to.contain('test-repo');
      done();
    });
  });
  
  it('.writeFile', function (done) {
    var gfs = this.gfs;

    gfs.writeFile('Testfile','This is sweet!!\nIndeed!\nNeat', done);
  });

});