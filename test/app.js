'use strict';
var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-generator').test;

describe('generator-potree:app', function () {
  before(function (done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .withOptions({
        'test-framework': 'mocha'
      })
      .withPrompts({
        features: ['includeSass', 'includeBootstrap', 'includeModernizr'],
        includeJQuery: true
      })
      .on('end', done);
  });

  it('creates files', function () {
    assert.file([
      'bower.json',
      'gulpfile.babel.js',
      'app/index.html'
    ]);
  });
});

describe('generator-potree:app no features', function () {
  before(function (done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .withOptions({
        'test-framework': 'jasmine'
      })
      .withPrompts({
        features: [],
        includeJQuery: false
      })
      .on('end', done);
  });

  it('creates files', function () {
    assert.file([
      'bower.json',
      'gulpfile.babel.js',
      'app/index.html'

    ]);
  });
});
