/*
 * Interface between the web server -> API calls and our algorithms.
 * Also gets and updates static info commonly needed by the app.
 */

const api = require("./../api/api"),
	  regions = require("./../api/client").regions,
	  cache = require("./../api/cache"),
	  times = cache.times,
	  cacheEngine = cache.engine,
	  StaticData = require("./StaticData"),
	  Config = require("../util/config"),
	  app = require("../../app"),
	  log = require("../util/log")("IoWA", "green"),
	  RankedChampionStats = require("./class/RankedChampionStats"),
	  SummonerProfile = require("./class/SummonerProfile"),
	  RankedWithMastery = require("./algorithm/RankedWithMastery");

let ChampionSpotlights;

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
	}, { region: app.config.get("default_region") });
	api.static_data.championAll((data) => {
		StaticData.data.champion = data.data;
		for(let champion_name in ChampionSpotlights.data)
			StaticData.data.champion[StaticData.championNameToId(champion_name)].youtube_link = ChampionSpotlights.data[champion_name];
	}, undefined, undefined, true, ["info", "stats", "image", "tags", "spells"], { region: app.config.get("default_region") });
}

module.exports = {
	renderSummonerPage(callback, region, name) {
		let response = {},
			check = preflight(region, name);

		if(check)
			return callback(check);

		api.summoner.byName((data) => {
			if(data.type === "error")
				return callback(data);

			let summoner = data[Object.keys(data)[0]];
			response = new SummonerProfile(summoner, region);

			callback(response);
		}, [name], { region: region });
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

		api.stats.ranked((data) => {
			if((data.type === "error" && data.code === 404) || !data.champions) {
				response.error = { text: "No ranked matches found for this player." };

				responded = true;
				return callback(response);
			}

			for(let champion of data.champions) {
				if(champion === null || champion.id === 0)
					continue;

				ranked_stats[champion.id] = new RankedChampionStats(champion);
			}

			checkSufficentData();
		}, id, undefined, undefined, { region: region });

		api.championMastery.getAll((data) => {
			champion_mastery = data;
			checkSufficentData();
		}, id, {
			region: region
		});
	}
};

setInterval(refreshCoreInformation, (times.VERY_LONG * 1000));
cacheEngine.loadTable();
ChampionSpotlights = new Config("data/champion_spotlights.json");
refreshCoreInformation();