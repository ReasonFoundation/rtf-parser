"use strict";

const RTFGroup = require("./rtf-group");

class RTFA extends RTFGroup {
  constructor(opts) {
    super();
    if (!opts) opts = {};
    this.value = opts.value;
    this.style = opts.style || {};
    this.href = opts.href || "";
  }
}

module.exports = RTFA;
