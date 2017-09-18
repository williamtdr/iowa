const iowa = require("./iowa/iowa"),
	  util = require("./util/util"),
	  StaticData = require("./iowa/StaticData").data;

function register(app) {
	app.get("/", (req, res) => {
		res.locals.extra_styles = [
			"/css/page/home.css"
		];

		if(req.session.error) {
			// Show errors from previous requests if they haven't expired
			if(util.getUnixTime() < req.session.error.expires)
				res.locals.error = req.session.error;

			delete req.session.error;
		}

		res.render("home");
	});

	app.get("/:region/:summonerName", (req, res) => {
		const region = req.param("region"),
			  summonerName = req.param("summonerName");

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
			res.locals.inline_script = `loadSummonerInfo("${region}", ${data.summoner_id});`;
			res.render("summoner");
		}, region, summonerName);
	});

	app.get("/data/:region/:id", (req, res) => {
		const region = req.param("region"),
			  id = req.param("id");

		iowa.renderDataPage((data) => {
			res.locals = data;
			res.locals.aggregateStats = JSON.stringify(data.aggregateStats);
			res.locals.championInfo = JSON.stringify(data.championInfo);

			res.render("summoner_data", {
				layout: false
			});
		}, region, id);
	});

	app.get("/js/background.js", (req, res) => {
		let backgroundStore = [];

		for(let champion_key in StaticData.champion) {
			let champion = StaticData.champion[champion_key];

			backgroundStore.push(StaticData.realm.cdn + "/img/champion/splash/" + champion.key + "_0.jpg");
		}

		res.locals.backgroundStore = JSON.stringify(backgroundStore);
		res.render("background", {layout: false});
	});

	app.use((req, res) => {
		res.locals.error = "404: Resource not found.";
		res.status(404).render("internal_error");
	})
}

module.exports = register;
