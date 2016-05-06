/*
 * Main application logic
 */
var api = require("./api/api"),
	regions = require("./api/client").regions
	times = require("./api/cache").times;

var realmInfo = {};

module.exports = {
	realmInfo: realmInfo,
	renderSummonerPage: (callback, region, name) => {
		var response = {};

		if(!regions[region])
			return callback({
				error: "Unknown Region."
			});

		if(name.length > 16 || /[&\\\/\|:;'"]/.test(name))
			return callback({
				error: "Invalid username."
			});

		api.summoner.byName((data) => {
			if(data[name]) {
				var summoner = data[name];

				response.name = name;
				response.id = summoner.id;
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
	}
};

var refreshCoreInformation = () => {
	console.log("Refreshing core information...");
	api.static_data.realm((data) => {
		realmInfo = data;
	}, {
		region: global.user_config.get("default_region")
	});
};

setInterval(refreshCoreInformation, times.VERY_LONG);
refreshCoreInformation();