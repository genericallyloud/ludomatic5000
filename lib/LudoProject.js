"use strict";

var path = require('path');
var fs = require("fs-extra");
var _ = require("underscore");
var jade = require('jade');
var hogan = require("hogan.js");
var less = require('less');
var request = require('request');
var Converter=require("csvtojson").core.Converter;

//constant for the name of the ludo directory
var BUILD_DIR = ".ludo";
var DEFAULTS = {
    output:"out.pdf",
    target:"pnp",
    paper:"letter",
    size:"poker",
    templ:"jade",
    backs:false,
    less:false,
    port:3000
};

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
        config = JSON.parse(configJson);
    }catch(err){}
    
    //now that we have all of the information, we can figure out things like
    //the target, paper, and all the different files that are going to be used
    this.config = config;
    this.componentConfig = config && config[this.component] || {};
    this.finalConfigs = _.extendOwn({},DEFAULTS,this.config,this.componentConfig,options);
    
    //as part of the initial setup lets make sure that the less code is compiled
    if(this.usingLess()){
        this.compileLess();
    }
}

/**
 * Checks to see if we're using the default component
 */
LudoProject.prototype.usingDefaultComponent = function(){
    return this.component === this.defaultComponent;
};

LudoProject.prototype.usingLess = function(){
    return this.finalConfigs.less;
};

LudoProject.prototype.usingGoogle = function(){
    return !!this.finalConfigs["google-id"];
};

LudoProject.prototype.getGoogleUrl = function(){
    var googleId = this.finalConfigs["google-id"];
    return "https://docs.google.com/spreadsheets/d/" + googleId + "/export?format=csv&id=" + googleId;
};
LudoProject.prototype.compileLess = function(){
    //read the content of the less file
    var lessFile = this.lessFile();
    var lessInput = fs.readFileSync(lessFile).toString();
    less.render(lessInput,{filename:lessFile})
    .then(function(output) {
        fs.writeFileSync(this.styleFile(), output.css);
    }.bind(this));
};

LudoProject.prototype.drawBacks = function(){
    return this.finalConfigs.backs;
};

LudoProject.prototype.outputPdf = function(){
    return this.finalConfigs.target !== "tgc";
};

LudoProject.prototype.dataFile = function(){
    return path.join(this.projectDirectory, "data", this.component+".csv");
};

LudoProject.prototype.templateType = function(){
    return this.finalConfigs.templ;
};

LudoProject.prototype.isJade = function(){
    return this.finalConfigs.templ === "jade";
};

LudoProject.prototype.isMustache = function(){
    return this.finalConfigs.templ === "mustache";
};

LudoProject.prototype.templateFile = function(){
    return path.join(this.projectDirectory, "templates", this.component+"."+this.templateType());
};

LudoProject.prototype.templateBackFile = function(){
    return path.join(this.projectDirectory, "templates", this.component+"_back."+this.templateType());
};

LudoProject.prototype.templateFunc = function(){
    var buildFile = path.join(BUILD_DIR,"_layout."+this.templateType());
    if(this.isJade()){
        return jade.compileFile(buildFile, {compileDebug:true});
    }else if(this.isMustache()){
        var templateString = fs.readFileSync(buildFile).toString();
        var partials = {
            _component:fs.readFileSync(this.templateFile()).toString()
        };
        if(this.drawBacks()){
            partials._component_back = fs.readFileSync(this.templateBackFile()).toString();
        }
        var compiled = hogan.compile(templateString);
        return function(context){
            return compiled.render(context, partials);
        };
    }else{
        console.error("Template engine must be either 'jade' or 'mustache'.");
    }
};

LudoProject.prototype.styleFile = function(){
    return path.join(this.projectDirectory, "styles", this.component+".css");
};

LudoProject.prototype.lessFile = function(){
    return path.join(this.projectDirectory, "less", this.component+".less");
};

LudoProject.prototype.outputFile = function(){
    return this.finalConfigs.output;
};

LudoProject.prototype.outputDir = function(){
    return path.join(this.projectDirectory, "out");
};

/**
 * Updates the hidden build directory so that the templates are all in one
 * place easily able to call each other for generating the html
 */
LudoProject.prototype.updateLudoDir = function(){
    //TODO - get rid of the need for a fixed layout. This should be calculated
    //based on constraints
    var templateModifier = this.command === "draw"?this.command+"_"+this.finalConfigs.target:this.command;
    var templateName = "_ludo_poker_letter_"+templateModifier+"."+this.templateType();
    var layoutTemplate = path.join(this.ludoDirectory, "templates",templateName);
    var templateFilename = path.basename(this.templateFile());
    
    //setup our build directory
    fs.removeSync(BUILD_DIR);
    fs.copySync('templates',BUILD_DIR);
    fs.renameSync(path.join(BUILD_DIR, templateFilename), path.join(BUILD_DIR,"_component."+this.templateType()));
    fs.copySync(layoutTemplate, path.join(BUILD_DIR,"_layout."+this.templateType()));
    
    var backFile = this.templateBackFile();
    if(fs.existsSync(backFile)){
        var backFilename = path.basename(backFile);
        fs.renameSync(path.join(BUILD_DIR, backFilename),
                      path.join(BUILD_DIR,"_component_back."+this.templateType()));
    }else{
        fs.writeFileSync(path.join(BUILD_DIR,"_component_back."+this.templateType()),".back");
    }
};

/**
 * Fetches the csv data and turns it into a json array which can be
 * merged with the template
 */
LudoProject.prototype.fetchCsvData = function(callback){
    var convert = function(data){
        var csvConverter=new Converter();
        csvConverter.fromString(data, callback);
    }
    if(this.usingGoogle()){
        request(this.getGoogleUrl(), function(err, response, body){
            if(err){
                console.error(err);
            }
            convert(body);
        });
    }else{
        convert(fs.readFileSync(this.dataFile()).toString());
    }
};

/**
 * In the case of outputting images instead of a pdf, we need to just get the data prepared once
 * and then reuse it for each separate row
 */
LudoProject.prototype.prepareCache = function(callback){
    this.fetchCsvData(function(err, rows){
        if(err){
            console.error(err);
            process.exit();
        }else{
            //process the data, hold onto it as the cache and then continue the callback
            this.cache = this.processData(rows);
            callback(this.cache);
        }
    }.bind(this));
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

LudoProject.prototype.generateSingleHtml = function(index, callback){
    callback(null,this.renderSingle(this.cache[index]));
};

/**
 * Performs a flatMap transformation over the array of rows coming from the csv.
 * During the transformation, we can modify the data, skip rows, or duplicate rows
 */
LudoProject.prototype.processData = function(rows){
    var useQuantity = this.command === "draw" && this.finalConfigs.target !== "tgc";
    
    //first, we can preprocess the array of json data
    //to do a few extra tricks.
    return _.flatten(_.map(rows, function(row){
        if(row["//"] === "//"){
            //skip a 'commented' out row
            return [];
        }else if(useQuantity && "quantity" in row && _.isNumber(row.quantity) ){
            var copies = [];
            //copy this quantity times
            _(row.quantity).times(function(i){
                copies[i] = _.clone(row);
            });
            return copies;
        }else{
            return [row];
        }
    }), true);
};

/**
 * Divides the incoming json array as required by the configuration,
 * bulds the context for the template, and runs its through the template,
 * returning the html
 */
LudoProject.prototype.render = function(jsonObj){
    //first, we can preprocess the array of json data
    //to do a few extra tricks.
    var processed = this.processData(jsonObj);
    return this.renderProcessed(processed);
};

/**
 * Takes the already processed data and generates html from it
 */
LudoProject.prototype.renderProcessed = function(processed){
    
    //need to paginate the rows for organization for the pdf
    var pages = [];
    var currPage = [];
    
    //need to group into chunks of 9
    for(var i=0;i<processed.length;i++){
        var pageIndex = i%9;
        var rowMax = (Math.floor(pageIndex/3) * 3) + 2;
        var reverseIndex = rowMax - (pageIndex%3);
        var comp = processed[i];
        comp.index = pageIndex;
        comp.reverseIndex = reverseIndex;
        if(i>0 && pageIndex===0){
            //start a new page
            pages.push({components:currPage});
            currPage=[];
        }
        currPage.push(comp);
    }
    //push the last page on
    pages.push({components:currPage});
    
    //create the template context
    var context = {
        ludo_styles:"ludo_styles/_ludo_layout.css",
        component_styles:"styles/" + path.basename(this.styleFile()),
        mode:this.command,
        componentName:this.component,
        drawBacks:this.drawBacks(),
        reload_script:"ludo_assets/reload.js",
        pages:pages
    };
    return this.templateFunc()(context);
};

LudoProject.prototype.renderSingle = function(singleComponent){
    //create the template context
    var context = {
        ludo_styles:"/ludo_styles/_ludo_layout.css",
        component_styles:"/styles/" + path.basename(this.styleFile()),
        mode:this.command,
        componentName:this.component,
        component:singleComponent
    };
    return this.templateFunc()(context);
};

LudoProject.prototype.port = function(){
    return this.finalConfigs.port;
};

LudoProject.prototype.url = function(){
    return "http://localhost:" + this.port();
};

module.exports = LudoProject;