#! /usr/bin/env node
var fs = require("fs-extra");
var LudoProject = require('./LudoProject');
var commandMap = require('./commands').commandMap;
var path = require('path');
var argv = require('yargs')
    .usage('Usage: $0 <command> [<args>]')
    .alias("v","version")
    .alias("h","help")
    .alias("t","target")
    .alias("p","paper")
    .argv;
    
//start with a sanity check on args to see if we need to display the help
if(argv._.length == 0 || argv.help){
    //output a message to indicate how to use ludo
    var usage = fs.readFileSync(path.join(__dirname,"usage.txt"),{encoding:"utf8"});
    console.log(usage);
    process.exit();
}

//which command was invoked
var command = argv._[0];

//which component if any
var componentName = null;
if(argv._.length>1){
    if(argv._.length>2){
        //too many arguments
        console.log("Too many arguments: '" + argv._.slice(1).join(" ") + "'. Use --help to view options.");
        process.exit();
    }else{
        componentName = argv._[1];
    }
}

//get the directories of ludomatic and the project 
var LUDO_DIR = fs.realpathSync(path.join(__dirname,".."));
var PROJECT_DIR = process.env.PWD;

//a LudoProject object wraps the context information so that it can be the single
//source of truth used by the commands
var ludoProject = new LudoProject(LUDO_DIR, PROJECT_DIR, command, argv, componentName);

if(commandMap.hasOwnProperty(command)){
    commandMap[command](ludoProject);
}