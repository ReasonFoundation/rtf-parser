"use strict";
const Transform = require("readable-stream").Transform;

class RTFParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.text = "";
    this.controlWord = "";
    this.controlWordParam = "";
    this.hexChar = "";
    this.parserState = this.parseText;
    this.char = 0;
    this.row = 1;
    this.col = 1;

    this.fieldDepth = 0;
    this.fieldType = "";
    // this.hasFieldInstruction = false;
    // /fldinst
    // this.fieldParam = "";
    this.processed = "";
  }
  _transform(buf, encoding, done) {
    const text = buf.toString("ascii");
    for (let ii = 0; ii < text.length; ++ii) {
      ++this.char;
      if (text[ii] === "\n") {
        ++this.row;
        this.col = 1;
      } else {
        ++this.col;
      }
      const textStr = text[ii];
      this.parserState(text[ii]);

      this.processed += textStr;
    }
    done();
  }
  _flush(done) {
    if (this.text !== "\u0000") this.emitText();
    done();
  }
  parseText(char) {
    if (char === "\\") {
      this.parserState = this.parseEscapes;
    } else if (char === "{") {
      this.emitStartGroup();
    } else if (char === "}") {
      this.emitEndGroup();
    } else if (char === "\x0A" || char === "\x0D") {
      // cr/lf are noise chars
    } else {
      this.text += char;
    }
  }

  parseEscapes(char) {
    if (char === "\\" || char === "{" || char === "}") {
      this.text += char;
      this.parserState = this.parseText;
    } else {
      this.parserState = this.parseControlSymbol;
      this.parseControlSymbol(char);
    }
  }
  parseControlSymbol(char) {
    if (char === "~") {
      this.text += "\u00a0"; // nbsp
      this.parserState = this.parseText;
    } else if (char === "-") {
      this.text += "\u00ad"; // soft hyphen
    } else if (char === "_") {
      this.text += "\u2011"; // non-breaking hyphen
    } else if (char === "*") {
      this.emitIgnorable();
      this.parserState = this.parseText;
    } else if (char === "'") {
      this.parserState = this.parseHexChar;
    } else if (char === "|") {
      // formula character
      this.emitFormula();
      this.parserState = this.parseText;
    } else if (char === ":") {
      // subentry in an index entry
      this.emitIndexSubEntry();
      this.parserState = this.parseText;
    } else if (char === "\x0a") {
      this.emitEndParagraph();
      this.parserState = this.parseText;
    } else if (char === "\x0d") {
      this.emitEndParagraph();
      this.parserState = this.parseText;
    } else {
      this.parserState = this.parseControlWord;
      this.parseControlWord(char);
    }
  }
  parseHexChar(char) {
    if (/^[A-Fa-f0-9]$/.test(char)) {
      this.hexChar += char;
      if (this.hexChar.length >= 2) {
        this.emitHexChar();
        this.parserState = this.parseText;
      }
    } else {
      this.emitError(`Invalid character "${char}" in hex literal.`);
      this.parserState = this.parseText;
    }
  }
  // insideField(depth) {
  //   return depth > 0;
  // }
  parseControlWord(char) {
    if (char === " ") {
      this.emitControlWord();
      this.parserState = this.parseText;
    } else if (/^[-\d]$/.test(char)) {
      this.parserState = this.parseControlWordParam;
      this.controlWordParam += char;
    } else if (/^[A-Za-z]$/.test(char)) {
      this.controlWord += char;
    } else {
      this.emitControlWord();
      this.parserState = this.parseText;
      this.parseText(char);
    }
  }
  parseControlWord(char) {
    if (char === " ") {
      this.emitControlWord();
      // fieldType is:
      // in a field
      // after a control word (fldinst or other)
      // first text after a space or {, and delimited by a space
      if (this.fieldDepth > 1 && this.fieldType.length === 0) {
        this.parserState = this.parseFieldInstruction;
      } else {
        this.parserState = this.parseText;
      }
    } else if (char === "{") {
      this.emitControlWord();
      if (this.fieldDepth > 1 && this.fieldType.length === 0) {
        this.parseText(char);
        this.parserState = this.parseFieldInstruction;
      } else {
        this.parserState = this.parseText;
        // need to parse bracket
        this.parseText(char);
      }
    }
    //If the character is a hyphen or a digit:
    else if (/^[-\d]$/.test(char)) {
      this.parserState = this.parseControlWordParam;
      this.controlWordParam += char;
      // If the character is an uppercase or lowercase letter:
    } else if (/^[A-Za-z]$/.test(char)) {
      this.controlWord += char;
      // For any other character:
    } else {
      this.emitControlWord();
      if (this.fieldDepth > 0 && this.fieldType.length === 0) {
        this.parserState = this.parseFieldInstruction;
      } else {
        this.parserState = this.parseText;
        this.parseText(char);
      }
    }
  }

  //rename to parseFieldType
  parseFieldInstruction(char) {
    // fieldtypes are either uppercase letters or "="
    // "=" indicates start of a <formula> but we don't process formulas right now
    if (
      /^[A-Za-z]$/.test(char)
      // || char === "="
    ) {
      this.fieldType += char;
      // For any other character:
    } else if (this.fieldType.length > 0) {
      this.parserState = this.parseFieldParam;
    } else {
      this.parserState = this.parseText;
    }
    //if char is alphabetic
    // add to fieldType
    // else parseText?
    // if (char === '\\') {
    //   this.parserState = this.parseHyperlinkControlWord
    // } else if (char === '{') {
    //   // ...
    // } else if (char === '}') {
    //   this.emitFieldInstruction()
    //   this.parserState = this.parseField
    // } else {
    //   this.fieldInstruction += char
    // }
  }

  parseFieldParam(char) {
    // there should be no new control words after a param, and therefore no "\"s
    if (char === " " || char === "{" || char === "}") {
      this.emitControlWord();
      this.parserState = this.parseText;
      this.parseText(char);
    } else {
      this.controlWordParam += char;
    }
  }

  parseControlWordParam(char) {
    if (/^\d$/.test(char)) {
      this.controlWordParam += char;
    } else if (char === " ") {
      this.emitControlWord();
      this.parserState = this.parseText;
    } else {
      this.emitControlWord();
      this.parserState = this.parseText;
      this.parseText(char);
    }
  }

  emitText() {
    if (this.text === "") return;
    this.push({
      type: "text",
      value: this.text,
      pos: this.char,
      row: this.row,
      col: this.col,
    });
    this.text = "";
  }
  emitControlWord() {
    if (this.controlWord === "field") {
      this.fieldDepth++;
    }
    this.emitText();

    if (this.controlWord === "" && this.fieldType === "") {
      this.emitError("empty control word");
    } else {
      this.push({
        type: "control-word",
        value: this.fieldType === "" ? this.controlWord : this.fieldType,
        param:
          this.controlWordParam === ""
            ? false
            : Number.isInteger(this.controlWordParam)
            ? Number(this.controlWordParam)
            : this.controlWordParam,
        pos: this.char,
        row: this.row,
        col: this.col,
      });
    }
    this.controlWord = "";
    this.controlWordParam = "";
    this.fieldType = "";
  }
  emitStartGroup() {
    console.log("EMIT START GROUP: " + this.processed);
    if (this.fieldDepth > 0) {
      this.fieldDepth++;
    }
    this.emitText();
    this.push({
      type: "group-start",
      pos: this.char,
      row: this.row,
      col: this.col,
    });
  }
  emitEndGroup() {
    console.log("EMIT END GROUP: " + this.processed);
    if (this.fieldDepth > 0) {
      this.fieldDepth--;
    }
    this.emitText();
    this.push({
      type: "group-end",
      pos: this.char,
      row: this.row,
      col: this.col,
    });
  }
  emitIgnorable() {
    if (this.fieldDepth > 0) {
      this.fieldDepth++;
    }
    this.emitText();
    this.push({
      type: "ignorable",
      pos: this.char,
      row: this.row,
      col: this.col,
    });
  }
  emitHexChar() {
    this.emitText();
    this.push({
      type: "hexchar",
      value: this.hexChar,
      pos: this.char,
      row: this.row,
      col: this.col,
    });
    this.hexChar = "";
  }
  emitError(message) {
    this.emitText();
    this.push({
      type: "error",
      value: message,
      row: this.row,
      col: this.col,
      char: this.char,
      stack: new Error().stack,
    });
  }
  emitEndParagraph() {
    this.emitText();
    this.push({
      type: "end-paragraph",
      pos: this.char,
      row: this.row,
      col: this.col,
    });
  }
}

module.exports = RTFParser;
