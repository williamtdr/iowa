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

const express = require("express"),
	  exphbs = require("express-handlebars"),
	  session = require("express-session"),
	  compression = require("compression"),
	  http = require("http"),
	  fs = require("fs"),
	  log = require("../util/log")("HTTP", "blue"),
	  exec = require("child_process").exec;

const util = require("../util/util"),
	  helpers = require("../util/helpers"),
	  routes = require("../routes"),
	  regions = require("../api/client").regions;

let httpServer,
	app = express();

class HTTP {
	constructor() {
		httpServer = http.createServer(app);

		app.set("view engine", "handlebars");

		app.use(compression());
		app.use(express.static("static"));
		app.use(session({
			secret: util.randomString(40),
			resave: false,
			saveUninitialized: true
		}));
		app.engine("handlebars", exphbs({ defaultLayout: "main", helpers }));
		app.locals.regions = Object.keys(regions);
		routes(app);

		// dist/ folder is not synced to GitHub for cleaner commits, so automatically build web files on first run
		fs.access("static/dist/iowa.min.css", fs.R_OK, (err) => {
			if(err) {
				log.info("Building minified web files for the first time...");
				exec("gulp stop", (error) => {
					if(error)  {
						log.warn("Error when rebuilding static files.");
						log.warn("Please check that you have gulp and compass installed and in your PATH.");

						process.exit(1);
					}
				});
			}
		});
	}

	init(bindTo) {
		return new Promise(resolve => {
			let addressParts = bindTo.split(":"),
				address = addressParts[0], port = addressParts[1];

			httpServer.listen(port, address, () => {
				log.info(`Web server listening on ${bindTo}`);
				resolve();
			});
		});
	}

	getWebServer() {
		return httpServer;
	}

	getApp() {
		return app;
	}
}

module.exports = HTTP;