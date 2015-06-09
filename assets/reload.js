(function(){
    var socket = io();
    socket.on('refresh', function(){
        console.log("getting a refresh event");
        // Reload the current page, without using the cache
        document.location.reload(true);
    });
})();