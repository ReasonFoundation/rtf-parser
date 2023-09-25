import tap from "tap";
import { Parser, Group } from "../rtf-parser-rewrite.js";
console.log("Test file opened");

tap.test("Parser", (t) => {
  t.test("parseText", (t) => {
    t.test("should handle escape characters", (t) => {
      const parser = new Parser("");
      parser.parseText("\\");
      t.equal(parser.parserState, parser.parseEscapes);
      t.end();
    });

    t.test("should handle left brace", (t) => {
      const parser = new Parser("");
      parser.parseText("{");
      t.ok(Parser.currentGroup instanceof Group);
      t.end();
    });

    t.end();
  });

  t.end();
});

tap.test("Group", (t) => {
  let group;

  t.beforeEach((done) => {
    group = new Group();
    done();
  });

  t.test("constructor", (t) => {
    t.test("should set default properties", (t) => {
      t.equal(group.parent, null);
      t.same(group.children, []);
      // t.equal(group.destination, null);
      t.equal(group.content, "");
      t.end();
    });

    t.end();
  });

  // ...

  t.end();
});

tap.test("Conversion", (t) => {
  t.test(`{\rtf1 Hello}`, (t) => {
    const parser = new Parser("{\rtf1 Hello}");
    const output = parser.render();
    t.equal(output, `<p>Hello</p>`);
    t.end();
  });
  t.test(
    `{\rtf1{\field{\*\fldinst{HYPERLINK "i.me/"}}{\fldrslt oral arguments}}}`,
    (t) => {
      const parser = new Parser(
        `{\rtf1{\field{\*\fldinst{HYPERLINK "i.me/"}}{\fldrslt oral arguments}}}`
      );
      const output = parser.render();
      t.equal(output, `<a href="i.me/">oral arguments</a>`);
      t.end();
    }
  );

  t.end();
});

// much better, so clean and nice
// const t = require("tap");
// const myThing = require("./my-thing.js");

// t.test("add() can add two numbers", (t) => {
//   t.equal(myThing.add(1, 2), 3, "1 added to 2 is 3");
//   t.equal(myThing.add(2, -1), 1, "2 added to -1 is 1");
//   t.throws(() => myThing.add("dog", "cat"), "cannot add dogs and cats");
//   t.end();
// });

// t.test("times() can multiply two numbers", (t) => {
//   t.equal(myThing.times(2, 2), 4, "2 times 2 is 4");
//   t.equal(myThing.times(-1, 3), 3, "-1 times 3 is -3");
//   t.throws(() => myThing.times("best", "worst"), "can only times numbers");
//   t.end();
// });
