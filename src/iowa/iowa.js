/*
 * Interface between the web server -> API calls and our algorithms.
 * Also gets and updates static info commonly needed by the app.
 */

var api = require("./../api/api"),
	regions = require("./../api/client").regions,
	cache = require("./../api/cache"),
	times = cache.times,
	cacheEngine = cache.engine,
	StaticData = require("./StaticData"),
	Config = require("../config"),
	RankedChampionStats = require("./class/RankedChampionStats"),
	SummonerProfile = require("./class/SummonerProfile"),
	RankedWithMastery = require("./algorithm/RankedWithMastery");

function preflight(region, name, id) {
	if(region !== undefined && !regions[region])
		return {
			error: "Unknown Region."
		};

	if(name === undefined || /[&\\\/\|:;'"]/.test(name))
		return {
			error: "Invalid username."
		};

	if(id !== undefined && isNaN(parseInt(id)))
		return {
			error: "Invalid summoner ID."
		};

	return false;
}

module.exports = {
	renderSummonerPage: (callback, region, name) => {
		var response = {},
			check = preflight(region, name);

		if(check)
			return callback(check);

		api.summoner.byName((data) => {
			if(data.type === "error")
				return callback(data);

			var summoner = data[Object.keys(data)[0]];
			response = new SummonerProfile(summoner, region);

			callback(response);
		}, [name], {
			region: region
		});
	},
	renderDataPage: (callback, region, id) => {
		var response = {},
			check = preflight(region, false, id),
			ranked_stats = {},
			responded = false,
			champion_mastery, champion, text;

		if(check)
			return callback(check);

		var checkSufficentData = () => {
			if(!champion_mastery || JSON.stringify(ranked_stats) === "{}")
				return;

			response = RankedWithMastery(ranked_stats, champion_mastery);

			if(!responded)
				callback(response);
		};

		api.stats.ranked((data) => {
			if((data.type === "error" && data.code === 404) || !data.champions) {
				response.error = {
					text: "No ranked matches found for this player."
				};

				responded = true;
				return callback(response);
			}

			for(var champion of data.champions) {
				if(champion === null || champion.id === 0)
					continue;

				ranked_stats[champion.id] = new RankedChampionStats(champion);
			}

			checkSufficentData();
		}, id, undefined, undefined, {
			region: region
		});

		api.championMastery.getAll((data) => {
			champion_mastery = data;
			checkSufficentData();
		}, id, {
			region: region
		});
	}
};

var refreshCoreInformation = () => {
	console.log("Refreshing core information...");
	api.static_data.realm((data) => {
		StaticData.data.realm = data;
	}, {
		region: global.user_config.get("default_region")
	});
	api.static_data.championAll((data) => {
		StaticData.data.champion = data.data;
		for(var champion_name in ChampionSpotlights.data)
			StaticData.data.champion[StaticData.championNameToId(champion_name)].youtube_link = ChampionSpotlights.data[champion_name];
	}, undefined, undefined, true, ["info", "stats", "image", "tags", "spells"], {
		region: global.user_config.get("default_region")
	});
};

setInterval(refreshCoreInformation, (times.VERY_LONG * 1000));
cacheEngine.loadTable();
var ChampionSpotlights = new Config("data/champion_spotlights.json", refreshCoreInformation);