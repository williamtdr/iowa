/*
 * Web & Websocket server. Provides an interface to the application.
 */
var express = require("express"),
	exphbs = require("express-handlebars"),
	websocket = require("websocket"),
	compression = require("compression"),
	fs = require("fs"),
	exec = require("child_process").exec;

var app = express();

app.engine("handlebars", exphbs({defaultLayout: 'main'}));
app.set("view engine", "handlebars");

app.use(compression());
app.use(express.static("static"));
app.get("/", function (req, res) {
	res.render("home");
});

var start = () => {
	var ip = global.user_config.get("web_server.ip"),
		port = global.user_config.get("web_server.port");

	app.listen(port, ip, () => {
		console.log("Web server listening on " + ip + ":" + port);
	});
},
	rebuild = () => {
		console.log("Building minified web files for the first time...");
		exec("gulp stop", (error, stdout) => {
			if(!error) start();
			else {
				console.log("Error when rebuilding web files - check you have gulp properly installed.");
			}
		});
	};

// dist/ folder is not synced to GitHub for cleaner commits, so automatically build web files on first run
fs.access('static/dist/iowa.min.css', fs.R_OK, (err) => {
	err ? rebuild() : start();
});
