"use strict";

const { cloneDeep, isEmpty } = require("lodash");
class RTFGroup {
  constructor(parent) {
    this.parent = parent;
    this.content = [];
    this.fonts = [];
    this.colors = [];
    this.style = {};
    this.ignorable = null;
  }
  get(name) {
    return this[name] != null ? this[name] : this.parent.get(name);
  }
  getFont(num) {
    const output =
      this.fonts[num] != null ? this.fonts[num] : this.parent.getFont(num);
    return output;
  }
  getColor(num) {
    return this.colors[num] != null
      ? this.colors[num]
      : this.parent.getFont(num);
  }
  getStyle(name) {
    if (!name) {
      const noNameOutput = Object.assign(
        {},
        this.parent.getStyle(),
        this.style
      );
      return noNameOutput;
    }

    const output =
      this.style[name] != null ? this.style[name] : this.parent.getStyle(name);

    return output;
  }
  resetStyle() {
    this.style = {};
  }
  addContent(node) {
    if (isEmpty(node.style) || (node.style.font && isEmpty(node.style.font))) {
      node.style = cloneDeep(this.getStyle());
      node.style.font = this.getFont(node.style.font);
      node.style.foreground = this.getColor(node.style.foreground);
      node.style.background = this.getColor(node.style.background);
    }
    this.content.push(node);
  }
}

module.exports = RTFGroup;
