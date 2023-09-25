"use strict";
import fs from "fs";
import { cloneDeep, isEmpty } from "lodash-es";

export class Parser {
  // static currentGroup = null;
  static fieldDepth = 0;
  static fieldInstruction = "";

  constructor(text) {
    // super({ objectMode: true });
    this.debug = true;
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
    this.rootGroup = new Group();
    this.currentGroup = this.rootGroup;
    this.groupStack = [];

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
      // const newGroup = new Group(this);
      // this.currentGroup.addChild(newGroup);
      // this.groupStack.push(this.currentGroup);
      // this.currentGroup = newGroup;
      this.startGroup();

      // Parser.currentGroup = new Group(this);
    } else if (char === "}") {
      this.endGroup();
    } else if (char === "\x0A" || char === "\x0D") {
      // cr/lf are noise chars
    } else if (
      this.fldinst === true &&
      this.checkIfAlphanumericAndUppercase(char)
    ) {
      this.parserState = this.parseFieldInstruction;
      this.parseFieldInstruction(char);
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
      // this.emitIgnorable();
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
      // } else if (char === "\x0a") {
    } else if (char === "\n") {
      //Checks if the character (char) is a Line Feed (LF),
      this.emitEndParagraph();
      this.parserState = this.parseText;
    } else if (char === "\r") {
      //Checks if the character (char) is a Carriage Return (CR),
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
      this.applyControlWord(this.controlWord);
      this.parserState = this.parseText;

      this.controlWord = "";
      this.controlWordParam = "";
    } else if (/^[-\d]$/.test(char)) {
      this.parserState = this.parseControlWordParam;
      this.controlWordParam += char;
    } else if (/^[A-Za-z]$/.test(char)) {
      this.controlWord += char;
    } else {
      // this.emitControlWord();
      this.applyControlWord(this.controlWord);

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
      this.applyControlWord(
        this.controlWord,
        this.controlWordParam !== "" && Number(this.controlWordParam)
      );
      this.controlWord = "";
      this.controlWordParam = "";
      this.parserState = this.parseText;
    } else {
      this.applyControlWord(
        this.controlWord,
        this.controlWordParam !== "" && Number(this.controlWordParam)
      );
      this.controlWord = "";
      this.controlWordParam = "";
      this.parserState = this.parseText;
      this.parseText(char);
    }
  }
  emitText() {
    if (this.debug) {
      if (this.text === "") {
        console.log("No text to add");
      } else {
        console.log("Added text: " + this.text);
      }
    }

    if (this.text === "") {
      return;
    }
    const text = new Group(this.currentGroup);
    text.style = cloneDeep(this.currentGroup.style);
    text.content = this.text;
    this.currentGroup.addChild(text);
    this.text = "";
  }
  startGroup(group) {
    this.emitText();
    let newGroup = new Group(this.currentGroup);

    if (group) {
      newGroup = group;
    }
    this.currentGroup.addChild(newGroup);
    this.groupStack.push(this.currentGroup);
    this.currentGroup = newGroup;
  }
  endGroup() {
    this.emitText();
    this.currentGroup = this.groupStack.pop();
  }
  applyControlWord(word, value) {
    this.emitText();

    switch (word) {
      // Document control words
      case "rtf":
        // this.currentGroup.style["version"] = value;
        // this.currentGroup.addStyle("version", value);
        this.currentGroup.version = value;
        break;

      // Field control words
      case "field":
        this.currentGroup.type = "field";
        // this.currentGroup.style["field"] = true;
        Parser.fieldDepth++;

        break;
      case "fldinst":
        this.currentGroup.type = "fldinst";
        // this.currentGroup.style["fieldInstruction"] = true;
        break;
      case "fldrslt":
        this.currentGroup.type = "fldrslt";
        // this.currentGroup.style["fieldResult"] = true;
        this.fieldDepth--;
        break;
      case "HYPERLINK":
        this.currentGroup.href = value;
        break;
      // Font and Size
      case "f":
        this.currentGroup.style["font"] = value;
        break;
      case "fs":
        this.currentGroup.style["fontSize"] = value;
        break;

      // Text formatting
      case "b":
        // this.currentGroup.style["bold"] = value !== "0";
        if (value === 0) {
          const clonedGroup = cloneDeep(this.currentGroup);
          delete clonedGroup.type;
          delete clonedGroup.children;
          delete clonedGroup.content;
          delete clonedGroup.style.bold;
          clonedGroup.children = [];
          this.endGroup();
          this.startGroup(clonedGroup);
        } else {
          this.currentGroup.addStyle("bold", value !== 0);
        }
        break;
      case "i":
        if (value === 0) {
          const clonedGroup = cloneDeep(this.currentGroup);
          delete clonedGroup.type;
          delete clonedGroup.children;
          delete clonedGroup.content;
          delete clonedGroup.style.italic;
          clonedGroup.children = [];
          this.endGroup();
          this.startGroup(clonedGroup);
        } else {
          this.currentGroup.addStyle("italic", value !== 0);
        }
        break;
      case "ul":
        this.currentGroup.style["underline"] = value !== 0;
        break;

      // Paragraph formatting
      case "par":
        // this.currentGroup.style["newParagraph"] = true;
        this.currentGroup.type = "paragraph";
        break;
      case "ql":
        this.currentGroup.style["align"] = "left";
        break;
      case "qr":
        this.currentGroup.style["align"] = "right";
        break;

      // Colors
      case "cf":
        this.currentGroup.style["textColor"] = value;
        break;
      case "highlight":
        this.currentGroup.style["highlightColor"] = value;
        break;

      default:
        console.log(`Unhandled control word: ${word}`);
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
          this.applyControlWord(this.controlWord, text);
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
  constructor(parent = null) {
    this.parent = parent;
    this.content = "";
    // this.style = {};
    this.children = [];
  }
  // addText(content) {
  //   this.content += content;
  // }
  addStyle(key, val) {
    if (typeof this.style === "undefined") {
      this.style = {};
    }

    this.style[key] = val;
  }
  // addContent(content) {
  //   if (this.style.fieldInstruction) {
  //     this.fieldInstruction += content;
  //   } else if (this.style.fieldResult) {
  //     this.fieldResult += content;
  //   } else {
  //     this.content += content;
  //   }
  // }
  // addContent(node) {
  //   node.style = cloneDeep(this.parent.style);

  //   this.children.push(node);
  // }
  addChild(childGroup) {
    this.children.push(childGroup);
  }
  findChildGroupsByType(type) {
    let foundGroups = [];

    // Check if the current group is of the given type
    if (this.type === type) {
      foundGroups.push(this);
    }

    if (this.children.length > 0) {
      // Recursively check each child
      for (let child of this.children) {
        const childFoundGroups = child.findChildGroupsByType(type);
        foundGroups = foundGroups.concat(childFoundGroups);
      }
    }
    return foundGroups;
  }
  findFirstChildGroupByType(type) {
    // Check if the current group is of the given type
    if (this.type === type) {
      return this;
    }

    if (this.children.length > 0) {
      // Recursively check each child
      for (let child of this.children) {
        const foundGroup = child.findFirstGroupByType(type);
        if (foundGroup) {
          return foundGroup;
        }
      }
    }
    // Return null if no matching group is found
    return null;
  }
  // Assuming this is a method of a class or object that has a children property
  findFirstChildGroupByFunc(func) {
    // Check if the current group passes the given function
    if (func(this) === true) {
      return this;
    }
    if (this.children.length > 0) {
      let foundGroup; // Declare foundGroup outside of loop
      // Recursively check each child
      for (let child of this.children) {
        // Ensure the method exists

        foundGroup = child.findFirstChildGroupByFunc(func);

        if (foundGroup) {
          return foundGroup;
        }
      }
    }
    // Return null if no matching group is found
    return null;
  }

  findChildGroupsByFunc(func) {
    let foundGroups = [];

    // Check if the current group passes the given function
    if (func(this)) {
      foundGroups.push(this);
    }

    if (this.children.length > 0) {
      // Recursively check each child
      for (let child of this.children) {
        const childFoundGroups = child.findChildGroupsByFunc(func);
        foundGroups = foundGroups.concat(childFoundGroups);
      }
    }
    return foundGroups;
  }
  // createChildGroup() {
  //   const childGroup = new RTFGroup(this);
  //   this.children.push(childGroup);
  //   return childGroup;
  // }

  render() {
    const renderBold = (wrapped) => {
      if (this?.style && this?.style?.bold) {
        return `<strong>${wrapped}</strong>`;
      } else {
        return wrapped;
      }
    };
    const renderItalics = (wrapped) => {
      if (this?.style && this?.style?.italic) {
        return `<em>${wrapped}</em>`;
      } else {
        return wrapped;
      }
    };

    if (this.type === "paragraph") {
      // ... existing paragraph rendering logic
      let htmlContent = "";
      for (let child of this.children) {
        htmlContent += child.render();
      }
      return `<p>${htmlContent}</p>`;
    } else if (this.type === "field") {
      // Initialize an empty string to store the HTML content
      let htmlContent = "";

      // Check for child with type 'fldinst' and an href property
      // let hrefChild = this.children.find(
      //   (child) => child.type === "fldinst" && child.href
      // );
      let hrefChild = this.findFirstChildGroupByFunc(
        (child) => typeof child.href !== "undefined"
      );

      // Check for child with type 'fldrslt' and a content property
      // let resultChild = this.children.find(
      //   (child) => child.type === "fldrslt" && child.content
      // );
      let resultChildren = this.findChildGroupsByFunc(
        (child) => child.content !== ""
      );

      if (hrefChild) {
        // Use the fldrslt content if available, otherwise render other children
        if (resultChildren.length > 0) {
          // htmlContent = resultChildren.content;

          for (let child of this.children) {
            // Skip rendering the fldinst and fldrslt children, as they're used for metadata
            if (child.type !== "fldinst") {
              htmlContent += child.render();
            }
          }
        }

        // Wrap the HTML content in an anchor link
        return `<a href="${hrefChild.href}">${htmlContent}</a>`;
      } else {
        // If no href, fallback to default behavior
        for (let child of this.children) {
          htmlContent += child.render();
        }
        return htmlContent;
      }
    } else {
      if (
        this.children.length === 0 &&
        typeof this.content !== "undefined" &&
        this.content.length > 0
      ) {
        // Default behavior: just return the content
        return renderItalics(renderBold(this.content));
      } else {
        let htmlContent = "";
        for (let child of this.children) {
          htmlContent += child.render();
        }
        if (htmlContent !== "") {
          return `${htmlContent}`;
        } else {
          return "";
        }
      }
    }
  }
}

const seen = new Set();
const replacer = (key, value) => {
  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
  }
  return value;
};
// console.log(JSON.stringify(parser.rootGroup, replacer, 2));
// let parser = new Parser(`{\rtf1 Hello}`);
const replaceSpecialChars = (inputString) => {
  return inputString.replace(/\\/g, "\\\\");
};
const doubleBackslash = (inputString) => {
  return inputString.replace(/\\(.)/g, "\\\\\\\\$1");
};
// `{\rtf1{\field{\*\fldinst{HYPERLINK "i.me/"}}{\fldrslt \b oral arguments \b0 }}}`
const rtfContent = fs.readFileSync("./fileWithNewLine.rtf", "utf8");

let parser = new Parser(rtfContent);

console.log(JSON.stringify(parser.rootGroup, replacer, 2));
console.log("RENDER: " + parser.rootGroup.render());

const result = {
  parent: {
    debug: true,
    controlWord: "",
    controlWordParam: "",
    hexChar: "",
    char: 71,
    row: 1,
    col: 1,
    fldinst: false,
    originalText:
      '{\\rtf1{\\field{\\*\\fldinst{HYPERLINK "i.me/"}}{\\fldrslt \\b bold \\b0 not bold }}}',
    text: "",
    processed:
      "{\\rtf1{\\field{\\*\\fldinst{HYPERLINK }}{\\fldrslt \\b bold \\b0 not bold }}}",
    groupStack: [],
    rtfText:
      '{\\rtf1{\\field{\\*\\fldinst{HYPERLINK "i.me/"}}{\\fldrslt \\b bold \\b0 not bold }}}',
    index: 78,
    fieldDepth: null,
  },
  content: "",
  children: [
    {
      content: "",
      children: [
        {
          content: "",
          children: [
            {
              content: "",
              children: [
                {
                  content: "",
                  children: [],
                  href: "i.me/",
                },
              ],
              type: "fldinst",
            },
            {
              content: "bold ",
              children: [],
              type: "fldrslt",
              style: {
                bold: true,
              },
            },
            {
              parent: {
                debug: true,
                controlWord: "b",
                controlWordParam: "0",
                hexChar: "",
                char: 59,
                row: 1,
                col: 1,
                fldinst: false,
                originalText:
                  '{\\rtf1{\\field{\\*\\fldinst{HYPERLINK "i.me/"}}{\\fldrslt \\b bold \\b0 not bold }}}',
                text: "bold ",
                processed:
                  "{\\rtf1{\\field{\\*\\fldinst{HYPERLINK }}{\\fldrslt \\b bold \\b0",
                rootGroup: {
                  content: "",
                  children: [
                    {
                      content: "",
                      children: [
                        {
                          content: "",
                          children: [
                            {
                              content: "",
                              children: [
                                {
                                  content: "",
                                  children: [],
                                  href: "i.me/",
                                },
                              ],
                              type: "fldinst",
                            },
                            null,
                          ],
                          type: "field",
                        },
                      ],
                      version: 1,
                    },
                  ],
                },
                groupStack: [null, null, null],
                rtfText:
                  '{\\rtf1{\\field{\\*\\fldinst{HYPERLINK "i.me/"}}{\\fldrslt \\b bold \\b0 not bold }}}',
                index: 65,
                fieldDepth: null,
              },
              content: "not bold ",
              children: [],
              type: "fldrslt",
              style: {},
            },
          ],
          type: "field",
        },
      ],
      version: 1,
    },
  ],
};

const result2 = {
  parent: {},
  content: "",
  children: [
    {
      content: "",
      children: [
        {
          content: "",
          children: [
            {
              content: "",
              children: [
                {
                  content: "",
                  children: [],
                  href: "i.me/",
                },
              ],
              type: "fldinst",
            },
            {
              content: "",
              children: [
                {
                  content: "bold ",
                  children: [],
                },
              ],
              type: "fldrslt",
              style: {
                bold: true,
              },
            },
            {
              type: "fldrslt",
              style: {
                italic: true,
              },
              children: [
                {
                  content: "not bold ",
                  children: [],
                },
                {
                  content: "italics ",
                  children: [],
                },
              ],
              content: "",
            },
            {
              type: "fldrslt",
              style: {},
              children: [],
              content: "",
            },
          ],
          type: "field",
        },
      ],
      version: 1,
    },
  ],
};

const result3 = {
  parent: null,
  content: "",
  children: [
    {
      content: "",
      children: [
        {
          content: "",
          children: [
            {
              content: "",
              children: [
                {
                  content: "",
                  children: [],
                  href: "i.me/",
                },
              ],
              type: "fldinst",
            },
            {
              content: "",
              children: [
                {
                  content: "bold ",
                  children: [],
                },
              ],
              type: "fldrslt",
              style: {
                bold: true,
              },
            },
            {
              type: "fldrslt",
              style: {
                italic: true,
              },
              children: [
                {
                  content: "not bold ",
                  children: [],
                },
                {
                  content: "italics ",
                  children: [],
                },
              ],
              content: "",
            },
            {
              type: "fldrslt",
              style: {},
              children: [],
              content: "",
            },
          ],
          type: "field",
        },
      ],
      version: 1,
    },
  ],
};

const result4 = {
  parent: null,
  content: "",
  children: [
    {
      content: "",
      children: [
        {
          content: "",
          children: [
            {
              content: "",
              children: [
                {
                  content: "",
                  children: [],
                  href: "i.me/",
                },
              ],
              type: "fldinst",
            },
            {
              content: "",
              children: [
                {
                  content: "bold ",
                  children: [],
                  style: {
                    bold: true,
                  },
                },
              ],
              type: "fldrslt",
              style: {
                bold: true,
              },
            },
            {
              type: "fldrslt",
              style: {
                italic: true,
              },
              children: [
                {
                  content: "not bold ",
                  children: [],
                  style: {},
                },
                {
                  content: "italics ",
                  children: [],
                  style: {
                    italic: true,
                  },
                },
              ],
              content: "",
            },
            {
              type: "fldrslt",
              style: {},
              children: [],
              content: "",
            },
          ],
          type: "field",
        },
      ],
      version: 1,
    },
  ],
};

const result5 = {
  parent: null,
  content: "",
  children: [
    {
      content: "",
      children: [
        {
          content: "",
          children: [
            {
              content: "",
              children: [
                {
                  content: "",
                  children: [],
                  href: "i.me/",
                },
              ],
              type: "fldinst",
            },
            {
              content: "",
              children: [
                {
                  content: "bold ",
                  children: [],
                  style: {
                    bold: true,
                  },
                },
              ],
              type: "fldrslt",
              style: {
                bold: true,
              },
            },
            {
              style: {
                italic: true,
              },
              children: [
                {
                  content: "not bold ",
                  children: [],
                  style: {},
                },
                {
                  content: "italics ",
                  children: [],
                  style: {
                    italic: true,
                  },
                },
              ],
            },
            {
              style: {},
              children: [],
            },
          ],
          type: "field",
        },
      ],
      version: 1,
    },
  ],
};
