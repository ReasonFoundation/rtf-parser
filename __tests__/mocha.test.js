import { expect } from "chai";
// import {
//   parseBold,
//   parseItalics,
//   parseHyperlink,
//   parseOtherControlWords,
// } from "../src/rtfParser";

describe("RTF Parser", () => {
  describe("parseBold", () => {
    it("should parse bold text correctly", () => {
      const mockData = "\\b example bold text \\b0";
      const result = parseBold(mockData);
      expect(result).to.equal("<b>example bold text</b>");
    });
  });

  describe("parseItalics", () => {
    it("should parse italic text correctly", () => {
      const mockData = "\\i example italic text \\i0";
      const result = parseItalics(mockData);
      expect(result).to.equal("<i>example italic text</i>");
    });
  });

  describe("parseHyperlink", () => {
    it("should parse hyperlinks correctly", () => {
      const mockData =
        '{\\field{\\*\\fldinst{HYPERLINK "http://example.com/"}}{\\fldrslt example link}}';
      const result = parseHyperlink(mockData);
      expect(result).to.equal('<a href="http://example.com/">example link</a>');
    });
  });

  describe("parseOtherControlWords", () => {
    it("should parse other control words correctly", () => {
      const mockData = "\\othercontrolwords example text";
      const result = parseOtherControlWords(mockData);
      expect(result).to.equal("expected output");
    });
  });
});
