'use strict';
var colors = require('cli-color');

module.exports = {
  log: function log(text) {
    console.log(text);
  },
  warn: function warn(text) {
    console.log(colors.yellow(text));
  },
  error: function error(text) {
    console.log(colors.red(text));
  },
  success: function success(text) {
    console.log(colors.green(text));
  }
};
