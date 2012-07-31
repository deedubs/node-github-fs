var expect = require('expect.js')
  , GithubFS = require('../')
  , authData = require('./auth');

describe('GithubFS', function () {
  before(function() {
    this.gfs = new GithubFS('deedubs/deploy', {auth: authData});
  });

  it('.rename');
  
  it('.stat');
  
  it('.unlink');
  
  it('.rmdir');
  
  it('.mkdir');
  
  it('.readdir', function (done) {
    var gfs = this.gfs;

    gfs.readdir('', function (err, dirListing) {
      expect(dirListing[0]).to.have.property('name');
      expect(dirListing[0]).to.have.property('path');
      expect(dirListing[0]).to.have.property('size');
      done();
    });    
  });
  
  it('.exists', function (done) {
    var gfs = this.gfs;

    gfs.exists('Makefile', function (exists) {
      expect(exists).to.be.ok();
      done();
    });
  });
  
  it('.readFile', function (done) {
    var gfs = this.gfs;

    gfs.readFile('Makefile', function (err, contents) {
      expect(contents).to.contain('install');
      done();
    });
  });
  
  it('.writeFile');

});