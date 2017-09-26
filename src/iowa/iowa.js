/*
 * Interface between the web server -> API calls and our algorithms.
 * Also gets and updates static info commonly needed by the app.
 */

const api = require("./../api/api"),
	  regions = require("./../api/client").regions,
	  cache = require("./../api/cache"),
	  cacheEngine = cache.engine,
	  urlencode = require('urlencode'),
	  StaticData = require("./StaticData"),
	  Config = require("../util/config"),
	  log = require("../util/log")("IoWA", "green"),
	  SelfAggregatedStats = require("./class/SelfAggregatedStats"),
	  SummonerProfile = require("./class/SummonerProfile"),
	  RankedWithMastery = require("./algorithm/RankedWithMastery");

let ChampionSpotlights,
	config;

function preflight(region, name, id) {
	if(region !== undefined && !regions[region])
		return { error: "Unknown Region." };

	if(name === undefined || /[&\\\/\|:;'"]/.test(name))
		return { error: "Invalid username." };

	if(id !== undefined && isNaN(parseInt(id)))
		return { error: "Invalid summoner ID." };

	return false;
}

function refreshCoreInformation() {
	log.info("Refreshing core information...");

	api.static_data.realm((data) => {
		StaticData.data.realm = data;
	}, { region: config.get("default_region") });
	api.static_data.championAll((data) => {
		StaticData.data.champion = data.data;
		for(let champion_name in ChampionSpotlights.data) {
			let cId = StaticData.championNameToId(champion_name);
			if(cId)
				StaticData.data.champion[cId].youtube_link = ChampionSpotlights.data[champion_name];
		}
	}, undefined, undefined, true, ["info", "stats", "image", "tags", "spells"], { region: config.get("default_region") });
}

module.exports = {
	renderSummonerPage(callback, region, name) {
		let check = preflight(region, name);

		if(check)
			return callback(check);

		api.summoner.byName((data) => {
			if(data.type === "error")
				return callback(data);

			callback(new SummonerProfile(data, region));
		}, [urlencode(name)], { region });
	},
	renderDataPage: (callback, region, id) => {
		let response = {},
			check = preflight(region, false, id),
			ranked_stats = {},
			responded = false,
			champion_mastery;

		if(check)
			return callback(check);

		function checkSufficentData() {
			if(!champion_mastery || JSON.stringify(ranked_stats) === "{}")
				return;

			response = RankedWithMastery(ranked_stats, champion_mastery);

			if(!responded)
				callback(response);
		};

		api.matchlist.ranked((data) => {
			if(data.type === "error" && data.code === 404) {
				response.error = { text: "No ranked matches found for this player." };

				responded = true;
				return callback(response);
			}

			for(let match of data.matches) {
				if(match === null || match.champion === 0)
					continue;

				let s = new SelfAggregatedStats(match.champion);
				s.matchIds.push(match.gameId);
				ranked_stats[match.champion] = s;
			}

			log.info(`Aggregating stats from ${Object.values(ranked_stats).length} champions on ${Object.values(ranked_stats).reduce((sum, v) => sum + v.matchIds.length, 0)} matches.`);

			let completedMatches = [];
			for(let cId in ranked_stats) {
				let c = ranked_stats[cId];

				for(let m of c.matchIds) {
					log.info(`Fetching match: ${m}`);

					api.match(data => {
						console.log(data);
					}, m, { region });
				}
			}

			checkSufficentData();
		}, id, undefined, undefined, { region });

		api.championMastery.getAll((data) => {
			champion_mastery = data;
			checkSufficentData();
		}, id, { region });
	},
	init(appConfig) {
		config = appConfig;

		cacheEngine.loadTable();
		ChampionSpotlights = new Config("data/champion_spotlights.json");
		refreshCoreInformation();
		cacheEngine.addInitEventHandler(times => {
			setInterval(refreshCoreInformation, (times.VERY_LONG * 1000));
		})
	}
};