/*
 * Serves as the interface to the application.
 * Layout & template files can be found in views/, styles & client-side
 * scripts in static/. When modifying the CSS or JS, run gulp in a separate
 * process to rebuild the minified files the client loads.
 *
 * Url structure:
 * / - Prompt for user & region, then redirect
 *
 * /{region}/{summonerName} - URL the user sees for profiles. Redirects to /
 * with an error if the summoner was not found, otherwise shows basic summoner
 * info and loads data in from an AJAX request, to allow time for the API requests
 * to complete.
 *
 * /data/{region}/{summonerName} - AJAX request from the profile page. Gets and
 * formats data from Riot APIs, then injected as HTML into the profile page when
 * done.
 */

var express = require("express"),
	exphbs = require("express-handlebars"),
	compression = require("compression"),
	session = require("express-session"),
	fs = require("fs"),
	exec = require("child_process").exec,
	utils = require("./utils"),
	iowa = require("./iowa/iowa"),
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
	secret: utils.randomString(40),
	resave: false,
	saveUninitialized: true
}));

app.use((req, res, next) => {
	var path = req.path.split("/"),
		region, name, id;

	if(app.locals.regions.indexOf(path[1]) > -1) {
		region = path[1];
		name = path[2];

		iowa.renderSummonerPage((data) => {
			res.locals = data;

			if(data.type === "error") {
				if(data.code === 404)
					data.text = "We couldn't find that summoner on the given region. Check your details and try again, or sign up for a new account <a href=\"http://signup.leagueoflegends.com\">here</a>."

				if(data.code === 403) {
					res.locals.error = "The API key being used by this server was rejected. Please check the system configuration at config/config.json, and make sure it is a valid API key from the <a href=\"http://developer.riotgames.com\" target=\"_blank\">Riot Games Developer Portal</a>.";
					return res.status(403).render("internal_error");
				}

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
			res.locals.inline_script = "loadSummonerInfo(\"" + region + "\", " + data.summoner_id + ");";
			res.render("summoner");
		}, region, name);
	} else if(path[1] === "data") {
		if(app.locals.regions.indexOf(path[2]) > -1) {
			region = path[2];
			id = path[3];

			iowa.renderDataPage((data) => {
				res.locals = data;

				res.render("summoner_data", {
					layout: false
				});
			}, region, id);
		}
	} else if(req.path === "" || req.path === "/" || req.path === "/index.html") {
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
	} else {
		res.locals.error = "404: Resource not found.";
		res.status(404).render("internal_error");
	}
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
				console.log("Error when rebuilding web files.");
				console.log("Please run: npm install gulp -g");
				process.exit();
			}
		});
	};

// dist/ folder is not synced to GitHub for cleaner commits, so automatically build web files on first run
fs.access("static/dist/iowa.min.css", fs.R_OK, (err) => {
	err ? rebuild() : start();
});
