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
	RankedChampionStats = require("./class/RankedChampionStats"),
	SummonerProfile = require("./class/SummonerProfile"),
	RankedBestChampion = require("./algorithm/RankedBestChampions");

function preflight(region, name, id) {
	if(region !== undefined && !regions[region])
		return {
			error: "Unknown Region."
		};

	if(name !== undefined && name.length > 16 || /[&\\\/\|:;'"]/.test(name))
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
			champion, text;

		if(check)
			return callback(check);

		api.stats.ranked((data) => {
			if((data.type === "error" && data.code === 404) || !data.champions) {
				response.error = {
					text: "No ranked matches found for this player."
				};

				return callback(response);
			}

			var champion_stats = {},
				champion_stats_array = [];

			for(var champion of data.champions) {
				if(champion === null || champion.id === 0)
					continue;

				champion_stats[champion.id] = new RankedChampionStats(champion);
				champion_stats_array.push(champion_stats[champion.id]);
			}

			var sorted_champions = [],
				order = RankedBestChampion(champion_stats_array);

			for(var el of order)
				sorted_champions.push(champion_stats[el]);

			response.champions = sorted_champions;

			callback(response);
		}, id, undefined, undefined, {
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
	}, undefined, undefined, true, ["enemytips", "image", "tags"], {
		region: global.user_config.get("default_region")
	});
};

setInterval(refreshCoreInformation, (times.VERY_LONG * 1000));
cacheEngine.loadTable();
refreshCoreInformation();