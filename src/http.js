/*
 * Web server. Provides an interface to the application.
 */
var express = require("express"),
	exphbs = require("express-handlebars"),
	compression = require("compression"),
	session = require('express-session'),
	fs = require("fs"),
	exec = require("child_process").exec,
	utils = require("./utils"),
	iowa = require("./iowa"),
	regions = require("./api/client").regions;

var app = express();

app.engine("handlebars", exphbs({
	defaultLayout: "main",
	helpers: {
		toUpperCase: (input) => {
			return input.toUpperCase();
		}
	}
}));
app.set("view engine", "handlebars");

app.use(compression());
app.use(express.static("static"));
app.locals.regions = Object.keys(regions);

app.use(session({
	secret: utils.randomHash(40),
	resave: false,
	saveUninitialized: true
}));

app.use((req, res, next) => {
	var path = req.path.split("/");
	if(app.locals.regions.indexOf(path[1]) > -1) {
		var region = path[1],
			name = path[2];

		iowa.renderSummonerPage((data) => {
			res.locals = data;
			console.log(data);

			if(data.type === "error") {
				if(data.code === 404)
					data.text = "We couldn't find that summoner on the given region. Check your details and try again, or sign up for a new account <a href=\"http://signup.leagueoflegends.com\">here</a>."

				req.session.error = {
					text: data.text || false,
					expires: Math.floor(Date.now() / 1000) + 30
				};

				return res.redirect(301, "/");
			}

			res.locals.extra_scripts = [
				"/js/page/summoner.js"
			];
			res.locals.extra_styles = [
				"/css/page/summoner.css"
			];
			res.render("summoner");
		}, region, name);
	} else {
		next();
	}
});

app.get("/", (req, res) => {
	res.locals.extra_scripts = [
		"/js/page/home.js"
	];
	res.locals.extra_styles = [
		"/css/page/home.css"
	];

	if(req.session.error) {
		// Show errors from previous requests if they haven't expired
		if(Math.floor(Date.now() / 1000) < req.session.error.expires)
			res.locals.error = req.session.error;

		delete req.session.error;
	}

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
