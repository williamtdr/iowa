/*
 * Web & Websocket server. Provides an interface to the application.
 */
var express = require("express"),
	exphbs = require("express-handlebars"),
	websocket = require("websocket");

var app = express();

app.engine("handlebars", exphbs({defaultLayout: 'main'}));
app.set("view engine", "handlebars");

app.get("/", function (req, res) {
	res.render("home");
});

var ip = global.user_config.get("web_server.ip"),
	port = global.user_config.get("web_server.port");

app.listen(port, ip, () => {
	console.log("Web server listening on " + ip + ":" + port);
});