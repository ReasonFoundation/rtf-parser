const fs = require("fs");
const rtfParser = require("./index");

const inputFile = "simpletest.rtf";
const outputFile = "output.json";

rtfParser.stream(fs.createReadStream(inputFile), (err, doc) => {
  if (err) {
    console.error(err);
    return;
  }

  fs.writeFileSync(outputFile, JSON.stringify(doc, null, 2));
});
