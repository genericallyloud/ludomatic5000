#! /usr/bin/env node
var argv = require('yargs')
    .usage('Usage: $0 -w [num] -h [num]')
    .demand(['w','h'])
    .argv;
 
console.log("The area is:", argv.w * argv.h);