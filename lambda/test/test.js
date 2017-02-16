'use strict';

const settings = require('./settings.json');
process.env.BUCKET = settings.bucket;
process.env.AWS_PROFILE = settings.awsProfile;
process.env.URL = 'http://test';

const assert = require('assert');
const resizer = require('../');
const mocha = require('mocha');

describe('image-resize', function() {
  describe('handle', function() {
    it('should return status code 404 when no dimensions are in the file name', function(done) {
      resizer.handler({
        'path': settings.imagePathOriginal,
      }, {}, (err, result) => {
        try {
          assert.equal(result.statusCode, '404');
          done();
        } catch(e) {
          done(e);
        }
      });
    });

    it('should return status code 307 when dimensions are in the file name', function(done) {
      resizer.handler({
        'path': settings.imagePathResized,
      }, {}, (err, result) => {
        try {
          assert.equal(result.statusCode, '307');
          assert.deepEqual(result.headers, {'location': `${process.env.URL}${settings.imagePathResized}`});
          done();
        } catch(e) {
          done(e);
        }
      });
    });

    it('should return status code 307 when one dimension is 0', function(done) {
      const path = settings.imagePathResized.replace(/x\d+-m/, 'x0');

      resizer.handler({
        path,
      }, {}, (err, result) => {
        if(err) {
          done(err);
          return;
        }
        try {
          assert.equal(result.statusCode, '307');
          assert.deepEqual(result.headers, {'location': `${process.env.URL}${path}`});
          done();
        } catch(e) {
          done(e);
        }
      });
    });

    it('should return status code 307 when one dimension is empty', function(done) {
      const path = settings.imagePathResized.replace(/x\d+-m/, 'x');

      resizer.handler({
        path,
      }, {}, (err, result) => {
        if(err) {
          done(err);
          return;
        }
        try {
          assert.equal(result.statusCode, '307');
          assert.deepEqual(result.headers, {'location': `${process.env.URL}${path}`});
          done();
        } catch(e) {
          done(e);
        }
      });
    });

    it('should return status code 307 with original key when both dimensions are 0', function(done) {
      const path = settings.imagePathResized.replace(/\d+x\d+-m/, 'x');

      resizer.handler({
        path,
      }, {}, (err, result) => {
        if(err) {
          done(err);
          return;
        }
        try {
          assert.equal(result.statusCode, '307');
          assert.deepEqual(result.headers, {'location': `${process.env.URL}${settings.imagePathOriginal}`});
          done();
        } catch(e) {
          done(e);
        }
      });
    });

    it('should return status code 404 when original image doesn\'t exist', function(done) {
      resizer.handler({
        path: '/doesnotexist-123x123.jpg',
      }, {}, (err, result) => {
        if(err) {
          done(err);
          return;
        }
        try {
          assert.equal(result.statusCode, '404');
          assert.equal(result.body, '404 - Not Found');
          done();
        } catch(e) {
          done(e);
        }
      });
    });
  });
});
