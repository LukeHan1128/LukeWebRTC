// Muaz Khan      - www.MuazKhan.com
// MIT License    - www.WebRTC-Experiment.com/licence
// Documentation  - github.com/muaz-khan/RTCMultiConnection

function resolveURL(url) {
    var isWin = !!process.platform.match(/^win/);
    if (!isWin) return url;
    return url.replace(/\//g, '\\');
}

// Please use HTTPs on non-localhost domains.
var isUseHTTPs = false;

// var port = 443;
var port = process.env.PORT || 9001;

try {
    process.argv.forEach(function(val, index, array) {
        if (!val) return;

        if (val === '--ssl') {
            isUseHTTPs = true;
        }
    });
} catch (e) {}

var fs = require('fs');
var path = require('path');

var ssl_key = fs.readFileSync(path.join(__dirname, resolveURL('fake-keys/privatekey.pem')));
var ssl_cert = fs.readFileSync(path.join(__dirname, resolveURL('fake-keys/certificate.pem')));
var ssl_cabundle = null;

// force auto reboot on failures
var autoRebootServerOnFailure = false;

// skip/remove this try-catch block if you're NOT using "config.json"
try {
    var config = require('./config.json');

    if ((config.https_port || '').toString() !== '9001') {
        port = parseInt(config.https_port);
    }

    if ((config.autoRebootServerOnFailure || '').toString() === 'true') {
        autoRebootServerOnFailure = true;
    }

    if ((config.isUseHTTPs || '').toString() === 'true') {
        isUseHTTPs = true;
    }

    ['ssl_key', 'ssl_cert', 'ssl_cabundle'].forEach(function(key) {
        if (!config['key'] || config['key'].toString().length) {
            return;
        }

        if (config['key'].indexOf('/path/to/') === -1) {
            if (key === 'ssl_key') {
                ssl_key = fs.readFileSync(path.join(__dirname, config['ssl_key']));
            }

            if (key === 'ssl_cert') {
                ssl_cert = fs.readFileSync(path.join(__dirname, config['ssl_cert']));
            }

            if (key === 'ssl_cabundle') {
                ssl_cabundle = fs.readFileSync(path.join(__dirname, config['ssl_cabundle']));
            }
        }
    });
} catch (e) { console.log(' ==== error : ' + e); }

// see how to use a valid certificate:
// https://github.com/muaz-khan/WebRTC-Experiment/issues/62
var options = {
    key: ssl_key,
    cert: ssl_cert,
    ca: ssl_cabundle
};

// You don't need to change anything below

var express = require('express');
var https_app= express();
var http_app= express();

var https = require('https');
var http = require('http');
var url = require('url');

var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var ejs = require('ejs');
var path = require('path');
var bodyParser = require('body-parser'); 


http_app.set('port', port);

https_app = https.createServer(options, http_app);

http_app.use(express.static(path.join(__dirname, 'public')));
http_app.use(bodyParser.json());
http_app.use(bodyParser.urlencoded({extended : true}));
http_app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));
http_app.set('view engine', 'ejs'); 
http_app.use(passport.initialize());
http_app.use(passport.session());
http_app.use(flash());

http_app.get('/', function(req, res){
  console.log('get /');
	fs.readFile(__dirname + '/views/index.ejs', 'utf8', function(error, data) {  
		res.writeHead(200, {'content-type' : 'text/html'});   
		res.end(ejs.render(data, {  
			roomID : req.query.roomID,  
//			isLogin : isLogin,
			description : 'Hello ejs With Node.js.. !'  
		}));  
	});  
});

function cmd_exec(cmd, args, cb_stdout, cb_end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    me.exit = 0;
    me.stdout = "";
    child.stdout.on('data', function(data) {
        cb_stdout(me, data)
    });
    child.stdout.on('end', function() {
        cb_end(me)
    });
}

function log_console() {
    console.log(foo.stdout);

    try {
        var pidToBeKilled = foo.stdout.split('\nnode    ')[1].split(' ')[0];
        console.log('------------------------------');
        console.log('Please execute below command:');
        console.log('\x1b[31m%s\x1b[0m ', 'kill ' + pidToBeKilled);
        console.log('Then try to run "server.js" again.');
        console.log('------------------------------');

    } catch (e) {}
}

function runServer() {
    https_app.on('error', function(e) {
        if (e.code == 'EADDRINUSE') {
            if (e.address === '0.0.0.0') {
                e.address = 'localhost';
            }

            var socketURL = (isUseHTTPs ? 'https' : 'http') + '://' + e.address + ':' + e.port + '/';

            console.log('------------------------------');
            console.log('\x1b[31m%s\x1b[0m ', 'Unable to listen on port: ' + e.port);
            console.log('\x1b[31m%s\x1b[0m ', socketURL + ' is already in use. Please kill below processes using "kill PID".');
            console.log('------------------------------');

            foo = new cmd_exec('lsof', ['-n', '-i4TCP:9001'],
                function(me, data) {
                    me.stdout += data.toString();
                },
                function(me) {
                    me.exit = 1;
                }
            );

            setTimeout(log_console, 250);
        }
    });

    https_app = https_app.listen(port, process.env.IP || '0.0.0.0', function(error) {
        var addr = https_app.address();

        if (addr.address === '0.0.0.0') {
            addr.address = 'localhost';
        }

        var domainURL = (isUseHTTPs ? 'https' : 'http') + '://' + addr.address + ':' + addr.port + '/';

        console.log('------------------------------');

        console.log('socket.io is listening at:');
        console.log('\x1b[31m%s\x1b[0m ', '\t' + domainURL);

        if (!isUseHTTPs) {
            console.log('use --ssl to enable HTTPs:');
            console.log('\x1b[31m%s\x1b[0m ', '\t' + 'node server.js --ssl');
        }

        console.log('Your web-browser (HTML file) MUST set this line:');
        console.log('\x1b[31m%s\x1b[0m ', 'connection.socketURL = "' + domainURL + '";');

        if (addr.address != 'localhost' && !isUseHTTPs) {
            console.log('Warning:');
            console.log('\x1b[31m%s\x1b[0m ', 'Please set isUseHTTPs=true to make sure audio,video and screen views can work on Google Chrome as well.');
        }

        console.log('------------------------------');
    });

    require('./Signaling-Server.js')(https_app, function(socket) {
        try {
            var params = socket.handshake.query;

            // "socket" object is totally in your own hands!
            // do whatever you want!

            // in your HTML page, you can access socket as following:
            // connection.socketCustomEvent = 'custom-message';
            // var socket = connection.getSocket();
            // socket.emit(connection.socketCustomEvent, { test: true });

            if (!params.socketCustomEvent) {
                params.socketCustomEvent = 'custom-message';
            }

            socket.on(params.socketCustomEvent, function(message) {
                try {
                    socket.broadcast.emit(params.socketCustomEvent, message);
                } catch (e) { console.log(' ==== error : ' + e); }
            });
        } catch (e) { console.log(' ==== error : ' + e); }
    });
    
    
}

if (autoRebootServerOnFailure) {
    // auto restart app on failure
    var cluster = require('cluster');
    if (cluster.isMaster) {
        cluster.fork();

        cluster.on('exit', function(worker, code, signal) {
            cluster.fork();
        });
    }

    if (cluster.isWorker) {
        runServer();
    }
} else {
    runServer();
}
