"use strict";

class RTFA {
  constructor(opts) {
    if (!opts) opts = {};
    this.value = opts.value;
    this.style = opts.style || {};
    this.href = opts.href || "";
  }
}

module.exports = RTFA;
