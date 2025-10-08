#!/usr/bin/env node
// https://github.com/microsoft/vscode/issues/70050

const regexPositionFromVSCode = process.argv.length - 1;
const fileNameRelative = process.argv[regexPositionFromVSCode];
process.argv[regexPositionFromVSCode] = fileNameRelative.replace(/\\/g, "/");

require("jest/bin/jest");
