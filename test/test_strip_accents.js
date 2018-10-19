var App = require('../app.js');
var assert = require('assert');

describe('StripAccents', function() {
  describe('functional test', function() {
    it('should return a when the value is á', function() {

      assert.equal(App.stripAccents('á'), 'a');

    });
  });
});
