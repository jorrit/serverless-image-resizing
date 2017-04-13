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
      let result = resizer.handler({
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
      let result = resizer.handler({
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

    it('should create file with same Cache-Control header as original file', function(done) {
      let result = resizer.handler({
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
  });
});
