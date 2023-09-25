"use strict";
// const Transform = require("readable-stream").Transform;

// class RTFParser {
//   constructor(text) {
//     // super({ objectMode: true });
//     this.text = text ? text : "";
//     this.controlWord = "";
//     this.controlWordParam = "";
//     this.hexChar = "";
//     this.parserState = this.parseText;
//     this.char = 0;
//     this.row = 1;
//     this.col = 1;

//     this.fieldDepth = 0;
//     this.fieldType = "";
//     // this.hasFieldInstruction = false;
//     // /fldinst
//     // this.fieldParam = "";
//     this.processed = "";

//     for (let ii = 0; ii < text.length; ++ii) {
//       ++this.char;
//       if (text[ii] === "\n") {
//         ++this.row;
//         this.col = 1;
//       } else {
//         ++this.col;
//       }
//       const textStr = text[ii];
//       this.parserState(text[ii]);

//       this.processed += textStr;
//     }
//   }

//   _flush(done) {
//     if (this.text !== "\u0000") this.emitText();
//     done();
//   }
//   parseText(char) {
//     if (char === "\\") {
//       this.parserState = this.parseEscapes;
//     } else if (char === "{") {
//       this.emitStartGroup();
//     } else if (char === "}") {
//       this.emitEndGroup();
//     } else if (char === "\x0A" || char === "\x0D") {
//       // cr/lf are noise chars
//     } else {
//       this.text += char;
//     }
//   }

//   parseEscapes(char) {
//     if (char === "\\" || char === "{" || char === "}") {
//       this.text += char;
//       this.parserState = this.parseText;
//     } else {
//       this.parserState = this.parseControlSymbol;
//       this.parseControlSymbol(char);
//     }
//   }
//   parseControlSymbol(char) {
//     if (char === "~") {
//       this.text += "\u00a0"; // nbsp
//       this.parserState = this.parseText;
//     } else if (char === "-") {
//       this.text += "\u00ad"; // soft hyphen
//     } else if (char === "_") {
//       this.text += "\u2011"; // non-breaking hyphen
//     } else if (char === "*") {
//       this.emitIgnorable();
//       this.parserState = this.parseText;
//     } else if (char === "'") {
//       this.parserState = this.parseHexChar;
//     } else if (char === "|") {
//       // formula character
//       this.emitFormula();
//       this.parserState = this.parseText;
//     } else if (char === ":") {
//       // subentry in an index entry
//       this.emitIndexSubEntry();
//       this.parserState = this.parseText;
//     } else if (char === "\x0a") {
//       this.emitEndParagraph();
//       this.parserState = this.parseText;
//     } else if (char === "\x0d") {
//       this.emitEndParagraph();
//       this.parserState = this.parseText;
//     } else {
//       this.parserState = this.parseControlWord;
//       this.parseControlWord(char);
//     }
//   }
//   parseHexChar(char) {
//     if (/^[A-Fa-f0-9]$/.test(char)) {
//       this.hexChar += char;
//       if (this.hexChar.length >= 2) {
//         this.emitHexChar();
//         this.parserState = this.parseText;
//       }
//     } else {
//       this.emitError(`Invalid character "${char}" in hex literal.`);
//       this.parserState = this.parseText;
//     }
//   }
//   // insideField(depth) {
//   //   return depth > 0;
//   // }
//   parseControlWord(char) {
//     if (char === " ") {
//       Parser.currentGroup.applyControlWord(
//         this.controlWord,
//         this.controlWordParam
//       );
//       this.parserState = this.parseText;
//     } else if (/^[-\d]$/.test(char)) {
//       this.parserState = this.parseControlWordParam;
//       this.controlWordParam += char;
//     } else if (/^[A-Za-z]$/.test(char)) {
//       this.controlWord += char;
//     } else {
//       this.emitControlWord();
//       this.parserState = this.parseText;
//       this.parseText(char);
//     }
//   }
//   parseControlWord(char) {
//     if (char === " ") {
//       this.emitControlWord();
//       // fieldType is:
//       // in a field
//       // after a control word (fldinst or other)
//       // first text after a space or {, and delimited by a space
//       if (this.fieldDepth > 1 && this.fieldType.length === 0) {
//         this.parserState = this.parseFieldInstruction;
//       } else {
//         this.parserState = this.parseText;
//       }
//     } else if (char === "{") {
//       this.emitControlWord();
//       if (this.fieldDepth > 1 && this.fieldType.length === 0) {
//         this.parseText(char);
//         this.parserState = this.parseFieldInstruction;
//       } else {
//         this.parserState = this.parseText;
//         // need to parse bracket
//         this.parseText(char);
//       }
//     }
//     //If the character is a hyphen or a digit:
//     else if (/^[-\d]$/.test(char)) {
//       this.parserState = this.parseControlWordParam;
//       this.controlWordParam += char;
//       // If the character is an uppercase or lowercase letter:
//     } else if (/^[A-Za-z]$/.test(char)) {
//       this.controlWord += char;
//       // For any other character:
//     } else {
//       this.emitControlWord();
//       if (this.fieldDepth > 0 && this.fieldType.length === 0) {
//         this.parserState = this.parseFieldInstruction;
//       } else {
//         this.parserState = this.parseText;
//         this.parseText(char);
//       }
//     }
//   }

//   //rename to parseFieldType
//   parseFieldInstruction(char) {
//     // fieldtypes are either uppercase letters or "="
//     // "=" indicates start of a <formula> but we don't process formulas right now
//     if (
//       /^[A-Za-z]$/.test(char)
//       // || char === "="
//     ) {
//       this.fieldType += char;
//       // For any other character:
//     } else if (this.fieldType.length > 0) {
//       this.parserState = this.parseFieldParam;
//     } else {
//       this.parserState = this.parseText;
//     }
//     //if char is alphabetic
//     // add to fieldType
//     // else parseText?
//     // if (char === '\\') {
//     //   this.parserState = this.parseHyperlinkControlWord
//     // } else if (char === '{') {
//     //   // ...
//     // } else if (char === '}') {
//     //   this.emitFieldInstruction()
//     //   this.parserState = this.parseField
//     // } else {
//     //   this.fieldInstruction += char
//     // }
//   }

//   parseFieldParam(char) {
//     // there should be no new control words after a param, and therefore no "\"s
//     if (char === " " || char === "{" || char === "}") {
//       this.emitControlWord();
//       this.parserState = this.parseText;
//       this.parseText(char);
//     } else {
//       this.controlWordParam += char;
//     }
//   }

//   parseControlWordParam(char) {
//     if (/^\d$/.test(char)) {
//       this.controlWordParam += char;
//     } else if (char === " ") {
//       this.emitControlWord();
//       this.parserState = this.parseText;
//     } else {
//       this.emitControlWord();
//       this.parserState = this.parseText;
//       this.parseText(char);
//     }
//   }

//   emitText() {
//     if (this.text === "") return;
//     this.push({
//       type: "text",
//       value: this.text,
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//     this.text = "";
//   }
//   emitControlWord() {
//     if (this.controlWord === "field") {
//       this.fieldDepth++;
//     }
//     this.emitText();

//     if (this.controlWord === "" && this.fieldType === "") {
//       this.emitError("empty control word");
//     } else {
//       this.push({
//         type: "control-word",
//         value: this.fieldType === "" ? this.controlWord : this.fieldType,
//         param:
//           this.controlWordParam === ""
//             ? false
//             : Number.isInteger(this.controlWordParam)
//             ? Number(this.controlWordParam)
//             : this.controlWordParam,
//         pos: this.char,
//         row: this.row,
//         col: this.col,
//       });
//     }
//     this.controlWord = "";
//     this.controlWordParam = "";
//     this.fieldType = "";
//   }
//   emitStartGroup() {
//     // console.log("EMIT START GROUP: " + this.processed);
//     if (this.fieldDepth > 0) {
//       this.fieldDepth++;
//     }
//     this.emitText();
//     this.push({
//       type: "group-start",
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//   }
//   emitEndGroup() {
//     // console.log("EMIT END GROUP: " + this.processed);
//     if (this.fieldDepth > 0) {
//       this.fieldDepth--;
//     }
//     this.emitText();
//     this.push({
//       type: "group-end",
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//   }
//   emitIgnorable() {
//     if (this.fieldDepth > 0) {
//       this.fieldDepth++;
//     }
//     this.emitText();
//     this.push({
//       type: "ignorable",
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//   }
//   emitHexChar() {
//     this.emitText();
//     this.push({
//       type: "hexchar",
//       value: this.hexChar,
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//     this.hexChar = "";
//   }
//   emitError(message) {
//     this.emitText();
//     this.push({
//       type: "error",
//       value: message,
//       row: this.row,
//       col: this.col,
//       char: this.char,
//       stack: new Error().stack,
//     });
//   }
//   emitEndParagraph() {
//     this.emitText();
//     this.push({
//       type: "end-paragraph",
//       pos: this.char,
//       row: this.row,
//       col: this.col,
//     });
//   }
// }
// const parser = new RTFParser("testing123");
// console.log(parser);
// module.exports = RTFParser;

export class Parser {
  // static currentGroup = null;
  static fieldDepth = 0;
  static fieldInstruction = "";

  constructor(text) {
    // super({ objectMode: true });
    this.controlWord = "";
    this.controlWordParam = "";
    this.hexChar = "";
    this.parserState = this.parseText;
    this.char = 0;
    this.row = 1;
    this.col = 1;
    this.fldinst = false;
    // this.fieldDepth = 0;
    // this.fieldType = "";
    // this.hasFieldInstruction = false;
    // /fldinst
    // this.fieldParam = "";
    this.originalText = text;
    this.text = "";
    this.processed = "";
    this.rootGroup = new Group(this);
    this.currentGroup = this.rootGroup;
    this.groupStack = [];

    // const replaceNewLinesAndCarriageReturns = (str) => {
    //   return str.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    // };
    const replaceSpecialChars = (str) => {
      return str
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\f/g, "\\f");
    };

    text = replaceSpecialChars(text);
    this.rtfText = text;
    // // Usage
    // const originalString = "Hello,\r\nWorld!";
    // const newString = replaceNewLinesAndCarriageReturns(originalString);
    // console.log(newString); // Output: Hello,\\r\\nWorld!
    this.index = 0;

    for (; this.index < text.length; ++this.index) {
      ++this.char;

      const textStr = text[this.index];
      this.parserState(text[this.index]);

      this.processed += textStr;
    }
  }
  render() {
    return "placeholder";
  }

  checkIfAlphanumericAndUppercase(char) {
    const regex = /^[A-Z0-9]$/;
    return regex.test(char);
  }

  parseText(char) {
    if (char === "\\") {
      this.parserState = this.parseEscapes;
    } else if (char === "{") {
      // Start of a new group.
      const newGroup = new Group(this);
      this.currentGroup.addChild(newGroup);
      this.groupStack.push(this.currentGroup);
      this.currentGroup = newGroup;

      // Parser.currentGroup = new Group(this);
    } else if (char === "}") {
      this.currentGroup.endGroup();
    } else if (char === "\x0A" || char === "\x0D") {
      // cr/lf are noise chars
    } else {
      if (this.fldinst === true && this.checkIfAlphanumericAndUppercase(char)) {
        this.parserState = this.parseFieldInstruction;
        this.parseFieldInstruction(char);
      }
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
  parseControlWord(char) {
    if (char === " ") {
      // this.emitControlWord();
      this.currentGroup.applyControlWord(this.controlWord);
      this.parserState = this.parseText;
    } else if (/^[-\d]$/.test(char)) {
      this.parserState = this.parseControlWordParam;
      this.controlWordParam += char;
    } else if (/^[A-Za-z]$/.test(char)) {
      this.controlWord += char;
    } else {
      // this.emitControlWord();
      this.currentGroup.applyControlWord(this.controlWord);

      if (this.controlWord === "fldinst") {
        // set flag so that we know we are looking for a fieldtype
        this.fldinst = true;
        // this.parserState = this.parseFieldInstruction;
      } else {
        // this.parserState = this.parseText;
        // this.parseText(char);
      }
      this.parserState = this.parseText;
      this.parseText(char);

      this.controlWord = "";
      this.controlWordParam = "";
    }
  }
  parseControlWordParam(char) {
    if (/^\d$/.test(char)) {
      this.controlWordParam += char;
    } else if (char === " ") {
      this.currentGroup.applyControlWord(
        this.controlWord,
        this.controlWordParam
      );
      this.controlWord = "";
      this.controlWordParam = "";
      this.parserState = this.parseText;
    } else {
      this.currentGroup.applyControlWord(
        this.controlWord,
        this.controlWordParam
      );
      this.controlWord = "";
      this.controlWordParam = "";
      this.parserState = this.parseText;
      this.parseText(char);
    }
  }
  isUppercase(char) {
    return /^[A-Z]$/.test(char);
  }
  extractFirstQuotedText(str) {
    const regex = /"([^"]*)"/;
    const match = str.match(regex);

    return match ? match[1] : null;
  }
  // extractFirstQuotedTextWithIndex.js
  extractFirstQuotedTextWithIndex(str) {
    const regex = /"([^"]*)"/;
    const match = str.match(regex);

    if (match) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length - 1;
      return {
        text: match[1],
        endIndex: endIndex,
      };
    }

    return null;
  }

  //so, actually, just set a flag and process the controls as usual
  //but, now, in the parseWhateverFunctions check if that flag is set and check if char is uppercase alphanumeric
  //if it is, then parse field inst or field type
  parseFieldInstruction(char) {
    if (this.isUppercase(char)) {
      this.controlWord += char;
    } else {
      switch (this.controlWord) {
        case "HYPERLINK":
          console.log("HYPERLINK CASE!");
          // this.parseHYPERLINK();
          const { text, endIndex } = this.extractFirstQuotedTextWithIndex(
            this.rtfText
          );
          this.currentGroup.applyControlWord(this.controlWord, text);
          this.controlWord = "";
          this.fldinst = false;
          this.index = endIndex;
          break;
      }
      this.parserState = this.parseText;
      //read the control word (should be the fieldtype, i.e. HYPERLINK)
      // switch condition, should parseHYPERLINK, use regex to get url
      // set parserState back to parseText
      //if this shit doesn't work then you gotta use the tool you used for last digital edition
    }
  }
}

export class Group {
  constructor(parser, parent = null) {
    this.parser = parser;
    this.parent = parent;
    this.content = "";
    this.formatting = {};
    this.children = [];
    this.fieldInstruction = "";
    this.fieldResult = "";
  }

  applyControlWord(word, value) {
    switch (word) {
      // Document control words
      case "rtf":
        this.formatting["version"] = value;
        break;

      // Field control words
      case "field":
        this.formatting["field"] = true;
        Parser.fieldDepth++;

        break;
      case "fldinst":
        // this.parser.parserState = this.parser.parseFieldInstruction;
        this.formatting["fieldInstruction"] = true;
        break;
      case "fldrslt":
        this.formatting["fieldResult"] = true;
        Parser.fieldDepth--;
        break;
      case "HYPERLINK":
        this.formatting["href"] = value;
        break;
      // Font and Size
      case "f":
        this.formatting["font"] = value;
        break;
      case "fs":
        this.formatting["fontSize"] = value;
        break;

      // Text formatting
      case "b":
        this.formatting["bold"] = value !== "0";
        break;
      case "i":
        this.formatting["italic"] = value !== "0";
        break;
      case "ul":
        this.formatting["underline"] = value !== "0";
        break;

      // Paragraph formatting
      case "par":
        this.formatting["newParagraph"] = true;
        break;
      case "ql":
        this.formatting["align"] = "left";
        break;
      case "qr":
        this.formatting["align"] = "right";
        break;

      // Colors
      case "cf":
        this.formatting["textColor"] = value;
        break;
      case "highlight":
        this.formatting["highlightColor"] = value;
        break;

      default:
        console.log(`Unhandled control word: ${word}`);
    }
  }

  addContent(content) {
    if (this.formatting.fieldInstruction) {
      this.fieldInstruction += content;
    } else if (this.formatting.fieldResult) {
      this.fieldResult += content;
    } else {
      this.content += content;
    }
  }
  addChild(childGroup) {
    this.children.push(childGroup);
  }
  createChildGroup() {
    const childGroup = new RTFGroup(this);
    this.children.push(childGroup);
    return childGroup;
  }

  endGroup() {
    // Parser.currentGroup = this.parent;
    this.parser.currentGroup = this.parser.groupStack.pop();
  }
}

// let parser = new Parser(`{\rtf1 Hello}`);
let parser = new Parser(
  `{\rtf1{\field{\*\fldinst{HYPERLINK "i.me/"}}{\fldrslt oral arguments}}}`
);
console.log(JSON.stringify(parser.rootGroup, null, 2));
