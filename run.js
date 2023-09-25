const fs = require("fs");
const rtfParser = require("./index");

// const inputFile = "test.rtf";
const inputFile = "file.rtf";
// const inputFile = "justbold.rtf";
const outputFile = "output.json";

rtfParser.stream(fs.createReadStream(inputFile), (err, doc) => {
  if (err) {
    console.error(err);
    return;
  }

  fs.writeFileSync(outputFile, JSON.stringify(doc, null, 2));
});
