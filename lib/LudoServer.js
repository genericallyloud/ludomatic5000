"use strict";

var express = require('express');
var path = require('path');
var socketio = require('socket.io');


/**
 * The LudoServer does the work of actually setting up a server which
 * can be used from a browser of wkhtmltopdf
 */
function LudoServer(ludoProject){
    this.ludoProject = ludoProject;
}

/**
 * Starts the server, the callback is called when ready or in case of error
 */
LudoServer.prototype.start = function(callback){
    var app = express();
    var ludoProject = this.ludoProject;
    app.get('/', function (req, res) {
        ludoProject.updateLudoDir();
        //to get this to refresh correctly, we move the actual fetch of csv data
        //and template parse and eval to happen on every single refresh
        ludoProject.generateHtml(function(err, html){
            res.send(html);
        });
    });
    var PROJECT_DIR = ludoProject.projectDirectory;
    var LUDO_DIR = ludoProject.ludoDirectory;
    
    app.use("/styles", express.static(path.join(PROJECT_DIR,"styles")));
    app.use("/assets", express.static(path.join(PROJECT_DIR,"assets")));
    app.use("/ludo_styles", express.static(path.join(LUDO_DIR,"styles")));
    app.use("/ludo_assets", express.static(path.join(LUDO_DIR,"assets")));

    this.server = app.listen(ludoProject.port(), callback);
    
    //set up livereload ability
    if(ludoProject.command=='design'){
        this.listenForReload();
    }
    
};

/**
 * Stop the web server
 */
LudoServer.prototype.stop = function(){
    this.server.close();
};

LudoServer.prototype.listenForReload = function(){
    var io = this.io = socketio(this.server);
    io.on('connection', function(socket){
        this.browserSocket = socket;
        this.browserSocket.on('disconnect', function(){
            this.browserSocket = null;
        }.bind(this));
    }.bind(this));
};


LudoServer.prototype.refreshBrowser = function(){
    if(this.browserSocket){
        this.browserSocket.emit('refresh');
    }
};

module.exports = LudoServer;