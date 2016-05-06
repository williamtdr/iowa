/*
 * Main application logic
 */
var api = require("./api/api"),
	regions = require("./api/client").regions,
	cache = require("./api/cache"),
	times = cache.times,
	cacheEngine = cache.engine;

var realmInfo = {},
	champions = {};

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
	realmInfo: realmInfo,
	renderSummonerPage: (callback, region, name) => {
		var response = {},
			check = preflight(region, name);

		if(check)
			return callback(check);

		api.summoner.byName((data) => {
			if(data[name.toLowerCase()]) {
				var summoner = data[name.toLowerCase()];

				response.name = name;
				response.summoner_id = summoner.id;
				response.level = summoner.summonerLevel;
				response.imageUrl = realmInfo.cdn + "/"+ realmInfo.v + "/img/profileicon/" + summoner.profileIconId + ".png";
				response.region = region;
			} else {
				response = data;
			}

			callback(response);
		}, [name], {
			region: region
		});
	},
	renderDataPage: (callback, region, id) => {
		var response = {},
			check = preflight(region, false, id);

		if(check)
			return callback(check);

		api.stats.ranked((data) => {
			if(data.type === "error" && data.code === 404) {
				response.error = {
					text: "No ranked matches found for this player."
				};
				return callback(response);
			}

			response.champions = data.champions;

			for(var champion of response.champions) {
				if(champion.id === 0)
					break;

				champion.name = champions[champion.id.toString()].name;
				champion.imageURL = realmInfo.cdn + "/"+ realmInfo.v + "/img/champion/" + champions[champion.id.toString()].image.full;
			}

			callback(response);
		}, id, undefined, undefined, {
			region: region
		});
	}
};

var refreshCoreInformation = () => {
	console.log("Refreshing core information...");
	api.static_data.realm((data) => {
		realmInfo = data;
	}, {
		region: global.user_config.get("default_region")
	});
	api.static_data.championAll((data) => {
		champions = data.data;
	}, undefined, undefined, true, ["enemytips", "image", "tags"], {
		region: global.user_config.get("default_region")
	});
};

setInterval(refreshCoreInformation, times.VERY_LONG);
cacheEngine.loadTable();
refreshCoreInformation();