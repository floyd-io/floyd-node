var http = require('http');
var RESOURCE_FILE = __dirname + '/model.json';

responses = {

  	"/part.html" : function(request, response) {
		response.writeHead(200, 
			//{"Content-Type": "text/plain"}
			{"Content-Type": "text/html; charset=UTF-8"},
			{"Transfer-Encoding": "chunked"}
		);
		//response.setHeader('Transfer-Encoding', 'chunked');
		//response.setHeader('Content-Type', 'text/html; charset=UTF-8');
		
		response.write("Hola!");

		setTimeout(function() {
			response.write(" Como");
			setTimeout(function() {
				response.end(" te va?");
			}, 4000);	
		}, 4000);	
  	},

  	"/part2.html" : function(request, response) {
  		fs = require('fs');
				
		reqId = request.headers['x-forwarded-for'] || 
				request.connection.remoteAddress || 
				request.socket.remoteAddress ||
				request.connection.socket.remoteAddress;
		
		console.log('Client Connected (' + reqId + ')');

		response.writeHead(200, 
			{"Content-Type": "text/html; charset=UTF-8"},
			{"Transfer-Encoding": "chunked"}
		);

		fs.readFile(RESOURCE_FILE, function(err, data) {
      			if (err) throw err;      			
      			response.write(data);
      	});
		
		//listener to handle the file changes
		watchListener = function(curr, prev) {
			if (curr.mtime - prev.mtime) {
				console.log('File Changed. Sending Data. (' + reqId + ')');
				fs.readFile(RESOURCE_FILE, function(err, data) {
					if (err) throw err;
					
					response.write(data);
				});
			}
		};
		
		//http sets the underlying socket a 2 mins timeout
		//where it destroys the sockets. 
		//if we add a timeout, then the socket won't get
		//destroyed so we have to handle it ourselves.
		//https://github.com/joyent/node/blob/v0.10.26-release/lib/http.js#L1933
		
		request.socket.removeAllListeners('timeout'); 
		request.socket.setTimeout(1000 * 60 * 1); 
		request.socket.on('timeout', function() { 		
			console.log('Timed Out. Disconnecting (' + reqId + ')');
			
			fs.unwatchFile(RESOURCE_FILE, watchListener);
			response.end();

			request.socket.destroy();
		})
		
		request.on("close", function() {
			console.log('Client disconnected (' + reqId + ')');
			
			fs.unwatchFile(RESOURCE_FILE, watchListener);
			response.end();

			request.socket.destroy();
		});
		
		//suscribe listener to file changes...
		fs.watchFile(RESOURCE_FILE, { interval: 150 }, watchListener);
  	}
}

http.createServer(function (request, response) {
  var func = responses[request.url];
  if (func !== undefined) {
    func(request, response);
  }
  else {
    response.writeHead(404);
    response.end("404, not found.");
  }
}).listen(1337);

console.log('Server running at http://127.0.0.1:1337/');
console.log('Serving File -> ' + RESOURCE_FILE);
