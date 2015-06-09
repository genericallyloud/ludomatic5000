"use strict";

var path = require('path');
var fs = require("fs-extra");
var jade = require('jade');
var Converter=require("csvtojson").core.Converter;

//constant for the name of the ludo directory
var BUILD_DIR = ".ludo";

/**
 * The LudoProject class wraps the file and configuration information
 * about ludo and the current ludo project to be able to perform commands.
 */
function LudoProject(ludoDirectory, projectDirectory, command, options, componentName){
    this.ludoDirectory = ludoDirectory.toString();
    this.projectDirectory = projectDirectory.toString();
    this.command = command;
    this.options = options;
    this.defaultComponent = path.basename(projectDirectory);
    if(!componentName){
        //use the directory name as the default
        this.component = this.defaultComponent;
    }else{
        this.component = componentName;
    }
    
    var config = null;
    try{
        var configJson = fs.readFileSync(path.join(this.projectDirectory,"ludo.json"),{encoding:"utf8"});
        this.config = JSON.parse(configJson);
    }catch(err){}
    
    //now that we have all of the information, we can figure out things like
    //the target, paper, and all the different files that are going to be used
    this.config = config;
}

/**
 * Checks to see if we're using the default component
 */
LudoProject.prototype.usingDefaultComponent = function(){
    return this.component === this.defaultComponent;
};

LudoProject.prototype.dataFile = function(){
    return path.join(this.projectDirectory, "data", this.component+".csv");
};

LudoProject.prototype.templateFile = function(){
    return path.join(this.projectDirectory, "templates", this.component+".jade");
};

LudoProject.prototype.templateFunc = function(){
    return jade.compileFile(path.join(BUILD_DIR,"_layout.jade"), {compileDebug:true});
};

LudoProject.prototype.styleFile = function(){
    return path.join(this.projectDirectory, "styles", this.component+".css");
};

LudoProject.prototype.outputFile = function(){
    //TODO - replace with actual configuration
    return "out.pdf";
};

/**
 * Updates the hidden build directory so that the templates are all in one
 * place easily able to call each other for generating the html
 */
LudoProject.prototype.updateLudoDir = function(){
    //TODO - get rid of the need for a fixed layout. This should be calculated
    //based on constraints
    var layoutTemplate = path.join(this.ludoDirectory, "templates","_ludo_poker_letter.jade");
    var templateFilename = path.basename(this.templateFile());
    
    //setup our build directory
    fs.removeSync(BUILD_DIR);
    fs.copySync('templates',BUILD_DIR);
    fs.renameSync(path.join(BUILD_DIR, templateFilename), path.join(BUILD_DIR,"_component.jade"));
    fs.copySync(layoutTemplate, path.join(BUILD_DIR,"_layout.jade"));
};

/**
 * Fetches the csv data and turns it into a json array which can be
 * merged with the template
 */
LudoProject.prototype.fetchCsvData = function(callback){
    var data=fs.readFileSync(this.dataFile()).toString();
    var csvConverter=new Converter();
    
    csvConverter.fromString(data, callback);
};

/**
 * Fetches the csv data and turns it into a json array which can be
 * merged with the template
 */
LudoProject.prototype.generateHtml = function(callback){
    this.fetchCsvData(function(err, jsonObj){
        if(err){
            callback(err);
        }else{
            //I've got the data, now I need to generate the html itself
            callback(null,this.render(jsonObj));
        }
    }.bind(this));
};

/**
 * Divides the incoming json array as required by the configuration,
 * bulds the context for the template, and runs its through the template,
 * returning the html
 */
LudoProject.prototype.render = function(jsonObj){
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
        component_styles:"styles/" + path.basename(this.styleFile()),
        mode:this.command,
        componentName:this.component,
        reload_script:"ludo_assets/reload.js",
        pages:pages
    };
    return this.templateFunc()(context);
};

LudoProject.prototype.port = function(){
    return 3000;
};

LudoProject.prototype.url = function(){
    return "http://localhost:" + this.port();
};

module.exports = LudoProject;