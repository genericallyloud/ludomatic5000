#! /usr/bin/env node
var argv = require('yargs')
    .usage('Usage: $0 <command> [<args>]')
    .argv;

var _ = require('underscore');
var fs = require("fs-extra");
var wkhtmltopdf = require('wkhtmltopdf');
var jade = require('jade');
var open = require("open");
var Converter=require("csvtojson").core.Converter;
var express = require('express');
var app = express();

console.log("The command is:" + argv._[0]);
var command = argv._[0];

//need to rename the template for out target to be
/*
    Algorithm:
    - remove .ludo dir if it exists
    - copy project templates as .ludo
    - renaming the target component template to _component.jade
    - copy correct layout ludo template into .ludo
    - read the target csv file as json
    - run data through _component template from the .ludo directory and generate html
    - start a server which maps:
        - / to the generated html
        - /styles/* to the project styles directory
        - /assets/* to the project assets directory
        - /ludo_styles/* to the ludo styles directory
*/

var LUDO_DIR = fs.realpathSync(__dirname+"/../");
var PROJECT_DIR = process.env.PWD;
var BUILD_DIR = ".ludo";

var layoutTemplate = LUDO_DIR + "/templates/_ludo_poker_letter.jade";
var componentTemplate = BUILD_DIR+"/cards.jade";

//setup our build directory
function build(){
    fs.removeSync(BUILD_DIR);
    fs.copySync('templates',BUILD_DIR);
    fs.renameSync(componentTemplate, BUILD_DIR+"/_component.jade");
    fs.copySync(layoutTemplate, BUILD_DIR+"/_layout.jade");

    var testData = PROJECT_DIR + "/data/cards.csv";
    var data=fs.readFileSync(testData).toString();
    var csvConverter=new Converter();

    csvConverter.fromString(data,function(err,jsonObj){
        if (err){console.error(err);}

        var html = createHtml(jsonObj);
        setupServer(html);
    });
}

function createHtml(jsonObj){
    var fn = jade.compileFile(BUILD_DIR+"/_layout.jade", {compileDebug:true});
    var pages = [];
    var currPage = [];

    //need to group into chunks of 8
    for(var i=0;i<jsonObj.length;i++){
        if(i>0 && i%9===0){
            //start a new page
            pages.push({components:currPage});
            currPage=[];
        }
        currPage.push(jsonObj[i]);
    }
    //push the last page on
    pages.push({components:currPage});

    //create the template context
    var context = {
        ludo_styles:"ludo_styles/_ludo_layout.css",
        component_styles:"styles/cards.css",
        pages:pages
    };
    return fn(context);
}

function setupServer(html){

    app.get('/', function (req, res) {
      res.send(html);
    });

    app.use("/styles", express.static(PROJECT_DIR+"/styles"));
    app.use("/ludo_styles", express.static(LUDO_DIR+"/styles"));
    app.use("/assets", express.static(PROJECT_DIR+"/assets"));

    var server = app.listen(3000, function(){
        if(command === "draw"){
            generatePdf(server);
        }else if (command !== "silent"){
            open("http://localhost:3000");
            console.log("designing at http://localhost:3000");
        }
    });
}

function generatePdf(server){
    console.log("generating pdf");
    wkhtmltopdf("http://localhost:3000",
        {
            pageSize: 'letter',
            orientation:'portrait',
            marginBottom:0,
            marginLeft:0,
            marginTop:0,
            marginRight:0
        })
        .on("end", function(){
            //close the server once we're done so that the app can finish
            server.close();
        })
        .pipe(fs.createWriteStream('out.pdf'));
}

build();
