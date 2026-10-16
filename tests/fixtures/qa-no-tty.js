'use strict';

const fs = require('node:fs');

if (process.stdin.isTTY) throw new Error('QA inherited a TTY');
if (fs.readFileSync(0).length !== 0) throw new Error('QA stdin is not closed');
console.log('stdin closed');
