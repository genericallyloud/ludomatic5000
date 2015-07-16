"use strict";

var fs = require("fs-extra");
var path = require('path');
var LudoServer = require("./LudoServer");
var wkhtmltopdf = require('wkhtmltopdf');
var wkhtmltoimage = require('wkhtmltoimage');
var open = require("open");

/**
 * Takes an empty project directory and adds the directories that will be needed
 * If a component name is supplied, it will also create stub files for a new directory.
 */
function initProject(ludoProject){
    //need to make the basic directories and the config file, unless
    //the passed in config file is not null
    ["data","styles","templates","assets"].forEach(function(dir){
        fs.mkdirp(dir);
    });
    newComponent(ludoProject);
}

/**
 * Creates stub files for a new component, and add an entry
 * into the config file
 */
function newComponent(ludoProject){
    var ludoJson;
    if(!ludoProject.config){
        ludoJson = {
            target:"pnp",
            paper:"letter"
        };
    }else{
        ludoJson = ludoProject.config;
    }
    var component = ludoProject.component;
    if(!ludoProject.usingDefaultComponent()){
        //check to see if this component already exists. If so, we want to just fail hard.
        if(ludoJson.components && ludoJson.components[component]){
            console.log("Error: A component already exists for '" + component + "'");
            process.exit();
        }
        if(!ludoJson.components){
            ludoJson.components = {};
        }
        //ok, this component does not exist yet, let's make an entry
        //it will be empty because it uses the defaults
        ludoJson.components[component] = {}
    }
    
    //write the config file back to disk
    fs.writeFileSync("ludo.json", JSON.stringify(ludoJson,null,4));
    
    //now add stub files into each directory
    "dataFile,templateFile,styleFile".split(",").forEach(function(fileFunc){
        var file = ludoProject[fileFunc]();
        if(!fs.existsSync(file)){
            //only create a stub file if it doesn't already exist
            fs.writeFileSync(ludoProject[fileFunc](), "");
        }
    });
}

/**
 * Creates a server for a single run and then outputs the result to a pdf
 */
function drawComponent(ludoProject){
    var server = new LudoServer(ludoProject);
    server.start(function(err){
        if(err){
            console.error(err);
            process.exit(1);
        }
        if(ludoProject.outputPdf()){
            drawPdf(ludoProject, server);
        }else{
            drawImage(ludoProject, server);
        }
    });
}

/**
 * The server has started and is ready to go - this path will 
 */
function drawPdf(ludoProject, server){
    wkhtmltopdf(ludoProject.url(),
        //TODO - change the page setup etc. based on target/config 
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
            server.stop();
            //exit hard if we have to
            process.exit();
        })
        .pipe(fs.createWriteStream(ludoProject.outputFile()));
}


function drawImage(ludoProject, server){
    //first update the build directory - just do this once upfront
    ludoProject.updateLudoDir();
    console.log("images will be generated and put in the 'out' directory");
    ludoProject.prepareCache(function(processed){
        console.log("generating...");
        var count = processed.length;
        var remaining = count;
        var baseUrl = ludoProject.url();
        var outputDir = ludoProject.outputDir();
        fs.mkdirp(outputDir);
        for(var i=0; i<count; i++){
            var outputFile = path.join(outputDir, ludoProject.component+i+".png");
            wkhtmltoimage.generate(baseUrl+"/row/"+i,
                {
                    width:300*2.5,
                    height:300*3.5,
                    disableSmartWidth:true,
                    output: outputFile
                }, function(){
                    remaining--;
                    if(remaining === 0){
                        //all complete, shut down
                        server.stop();
                        process.exit();
                    }
                });
        }
    });
}

/**
 * Creates a server which stays active and opens the browser to view the card files
 */
function designComponent(ludoProject){
    var server = new LudoServer(ludoProject);
    server.start(function(err){
        if(err){
            console.error(err);
            process.exit(1);
        }
        open(ludoProject.url());
        console.log("designing at "+ludoProject.url());
    });
    "data,templates,styles".split(",").forEach(function(watchDir){
        fs.watch(path.join(ludoProject.projectDirectory,watchDir),{recursive:true},function(){
            server.refreshBrowser();
        });
    });
    if(ludoProject.usingLess()){
        var lessFile = ludoProject.lessFile();
        fs.watch(path.dirname(lessFile),{recursive:true},function(){
            //something in the less directory changed, we need to re-evaluate
            ludoProject.compileLess();
        });
    }
}


exports.commandMap = {
    init:initProject,
    "new":newComponent,
    draw:drawComponent,
    design:designComponent
};

exports.initProject = initProject;
exports.newComponent = newComponent;
exports.drawComponent = drawComponent;
exports.designComponent = designComponent;