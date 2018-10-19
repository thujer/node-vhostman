var App = require('../app.js');
var assert = require('assert');

describe('StripAccents', function() {
  describe('Convert accent chars to ascii', function() {
    it('should return a when the value is á', function() {
      assert.equal(App.stripAccents('á'), 'a');
    });
  });
});
