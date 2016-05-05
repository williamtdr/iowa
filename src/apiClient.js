/*
 * Abstraction layer for Riot Games API in ES6. v1 (11pm on a Monday!)
 * Features:
 *   - Translates the REST requests used by the API into native JS functions.
 *   - Caches one-off requests as well as more static data (e.g. regions or champions)
 *   - Handles rate limits and queues requests as needed
 *   - Reuses data when available (e.g. if we've retrieved all champion data, then this
 *   ask for a specific champion by ID, return the result from the bigger cache).
 *
 * Cache files can normally be found in .cache and are saved for one day.
 * This behavior can be changed by modifying config.json.
 *
 * Last updated: May 4th, 2016. All endpoints were tested at time of writing.
 */

/*
 * TODO
 * [x] Finish implementing API methods
 * [x] Test all API methods
 * [ ] Caching for queries that take multiple summoner ids
 * [ ] Cache higher levels (e.g. whole champion list -> individual champions)
 * [ ] Cache expiration (including on individual endpoints)
 * [ ] Anticipate rate limits
 * [ ] Split into classes
 */

/*
 * Implementation notes:
 * Pass the region for each request in the options object. Caching can be configured
 * there too. To skip a parameter, pass a value of undefined. In most cases, the name
 * of the endpoint in Riot's API documentation corresponds to the function here.
 * Top-level endpoints are objects unless they only have one child, in which case
 * they're a function. Enjoy! :)
 */

var Client = require("node-rest-client").Client,
	fs = require("fs-extra");

const regionData = {
	"br": {
		host: "br.api.pvp.net",
		id: "BR1"
	},
	"eune": {
		host: "eune.api.pvp.net",
		id: "EUN1"
	},
	"euw": {
		host: "euw.api.pvp.net",
		id: "EUW1"
	},
	"jp": {
		host: "jp.api.pvp.net",
		id: "JP1"
	},
	"kr": {
		host: "kr.api.pvp.net",
		id: "KR"
	},
	"lan": {
		host: "lan.api.pvp.net",
		id: "LA1"
	},
	"las": {
		host: "las.api.pvp.net",
		id: "LA2"
	},
	"na": {
		host: "na.api.pvp.net",
		id: "NA1"
	},
	"oce": {
		host: "oce.api.pvp.net",
		id: "OC1"
	},
	"tr": {
		host: "tr.api.pvp.net",
		id: "TR1"
	},
	"ru": {
		host: "ru.api.pvp.net",
		id: "RU"
	},
	"pbe": {
		host: "pbe.api.pvp.net",
		id: "PBE1"
	}
};

var client = new Client({
	requestConfig: {
		timeout: 3000,
		noDelay: true
	},
	responseConfig: {
		timeout: 15000
	}
});

/*
 * Caches API responses to memory and the filesystem (default .cache/).
 */
var CacheEngine = {
	data: {},
	hitOr: (callback, id, onMiss) => {
		if(CacheEngine.data[id])
			return callback(CacheEngine.data[id]);

		fs.readJSON(global.user_config.get("cache.directory") + "/" + id + ".json", "utf8", (err, data) => {
			if(err) {
				onMiss((data) => {
					CacheEngine.save(id, data);
					callback(data);
				});
			} else {
				CacheEngine.data[id] = data;
				callback(data);
			}
		});
	},
	save: (id, data) => {
		CacheEngine.data[id] = data;
		fs.outputJSON(global.user_config.get("cache.directory") + "/" + id + ".json", data, (err) => {
			if(err)
				console.warn("Encountered a problem when trying to save the cache for an API request: " + err);
		});
	}
};

/*
 * Handles making the request to the Riot API servers, with simple error handling for the response.
 */
var requestor = (callback, info) => {
	var retrieve = (callback) => {
		var args = {
			path: info.pathParameters || {},
			parameters: info.queryParameters || {}
		}, key;

		for(key in args.path)
			if(args.path[key] === undefined)
				delete args.path[key];

		for(key in args.parameters)
			if(args.parameters[key] === undefined)
				delete args.parameters[key];

		args.parameters.api_key = global.user_config.get("credentials.riot_api_key");

		var req = client[info.method || "get"](info.fullPath || "https://" + regionData[info.region].host + info.path, args, (data, response) => {
			if(response.statusCode !== 200) {
				var callbackReply = {
					type: "error",
					code: response.statusCode
				};

				switch(response.statusCode) {
					case 400:
						callbackReply.text = "Bad request.";
					break;
					case 401:
						callbackReply.text = "Authorization failure.";
						console.warn("Warning: Received an authentication error from Riot's API servers. Make sure your API key is correct.");
					break;
					case 404:
						callbackReply.text = "Resource not found.";
					break;
					case 429:
						return setTimeout(() => retrieve(callback), (response.headers["Retry-After"] * 1000)); // todo: handle this better
					break;
					case 500:
						callbackReply.text = "The API encountered an internal server error.";
					break;
				}

				callback(callbackReply);
			} else
				callback(data);
		});

		req.on('requestTimeout', (req) => {
			callback({
				type: "error",
				text: "The request timed out before it could be executed. This implies an error with the machine - check you have available sockets."
			});
			req.abort();
		});

		req.on('responseTimeout', (res) => {
			callback({
				type: "error",
				text: "The request to the API server timed out. You can check the status of pvp.net servers at http://status.leagueoflegends.com/."
			});
		});

		req.on('error', (err) => {
			callback({
				type: "error",
				text: "Internal error before the request could be made: " + err
			});
		});
	};

	if(info.cache && info.cacheIdentifier)
		CacheEngine.hitOr(callback, info.cacheIdentifier, retrieve);
	else
		retrieve(callback);
};

module.exports.regionData = regionData;
module.exports.api = {
	/**
	 * The state of champions, including whether they are active, enabled for
	 * ranked play, in the free champion rotation, or available in bot games.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1077
	 * Cached: Default on, unless pulling free champion rotation
	 */
	champion: {
		// Retrieve champion by ID.
		getOne: (callback, id, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : true,
				cacheIdentifier: "champion/" + id + "_" + options.region,
				path: "/api/lol/${region}/v1.2/champion/${id}",
				pathParameters: {
					region: options.region,
					id: id
				}
			});
		},
		// Retrieve all champions.
		getAll: (callback, freeToPlay, options) => {
			// If cache isn't set, this request won't be cached with the freeToPlay option set to true.
			// When the rotation is cached, it's saved under a different file (champion_ftp.json).
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : freeToPlay !== true,
				cacheIdentifier: freeToPlay ? "champion_ftp_" + options.region : "champion_" + options.region,
				path: "/api/lol/${region}/v1.2/champion",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					freeToPlay: freeToPlay
				}
			});
		}
	},
	/**
	 * Information about a summoner's champion mastery, a statistic that increments as they
	 * play more matches as a specific champion. Scores for individual champions can be
	 * requested, or the full list can be obtained.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1071
	 * Cache: Default on
	 */
	championMastery: {
		// Get a champion mastery by player id and champion id. Response code 204 means there were no masteries found for given player id or player id and champion id combination.
		getOne: (callback, summonerId, championId, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : true,
				cacheIdentifier: "summoner/" + summonerId + "/championMastery/byChampion/" + championId,
				path: "/championmastery/location/${platformId}/player/${playerId}/champion/${championId}",
				pathParameters: {
					platformId: regionData[options.region].id,
					playerId: summonerId,
					championId: championId
				}
			});
		},
		// Get all champion mastery entries sorted by number of champion points descending.
		getAll: (callback, summonerId, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : true,
				cacheIdentifier: "summoner/" + summonerId + "/championMastery/all",
				path: "/championmastery/location/${platformId}/player/${playerId}/champions",
				pathParameters: {
					platformId: regionData[options.region].id,
					playerId: summonerId
				}
			});
		},
		// Get a player's total champion mastery score, which is sum of individual champion mastery levels.
		score: (callback, summonerId, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : true,
				cacheIdentifier: "summoner/" + summonerId + "/championMastery/score",
				path: "/championmastery/location/${platformId}/player/${playerId}/score",
				pathParameters: {
					platformId: regionData[options.region].id,
					playerId: summonerId
				}
			});
		},
		// Get specified number of top champion mastery entries sorted by number of champion points descending.
		topChampions: (callback, summonerId, count, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache !== undefined ? options.cache : true,
				cacheIdentifier: "summoner/" + summonerId + "/championMastery/top",
				path: "/championmastery/location/${platformId}/player/${playerId}/topchampions",
				pathParameters: {
					platformId: regionData[options.region].id,
					playerId: summonerId
				},
				queryParameters: {
					count: count
				}
			});
		}
	},
	/**
	 * If the summoner is currently in a game, this endpoint returns information about the
	 * current state of that game: Other participants, bans, time and gamemode are among the
	 * returned information.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/976
	 * Cache: Disabled
	 */
	currentGame: (callback, summonerId, options) => {
		requestor(callback, {
			region: options.region,
			path: "/observer-mode/rest/consumer/getSpectatorGameInfo/${platformId}/${summonerId}",
			pathParameters: {
				platformId: regionData[options.region].id,
				summonerId: summonerId
			}
		});
	},
	/**
	 * Lists summary information about featured games, as they are shown in the lower right
	 * of the pvp.net client's homepage.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/977
	 * Cache: Disabled
	 */
	featuredGames: (callback, options) => {
		requestor(callback, {
			region: options.region,
			path: "/observer-mode/rest/featured"
		});
	},
	/**
	 * Lists recently played matches for a given summoner ID. Detailed information
	 * includes that similar to that which is shown at the end-of-game screen.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1078
	 * Cache: Default off
	 */
	game: (callback, summonerId, options) => {
		requestor(callback, {
			region: options.region,
			cache: options.cache !== undefined ? options.cache : false,
			cacheIdentifier: "summoner/" + summonerId + "/games",
			path: "/api/lol/${region}/v1.3/game/by-summoner/${summonerId}/recent",
			pathParameters: {
				region: options.region,
				summonerId: summonerId
			}
		});
	},
	/**
	 * Ranked information by summoner, team, or list tiers for upper
	 * levels (challenger/master). Shows participants in a league.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/985
	 * Cache: Varies
	 */
	league: {
		// Get leagues mapped by summoner ID for a given list of summoner IDs.
		bySummoner: (callback, summonerIds, options) => {
			if(Array.isArray(summonerIds))
				summonerIds = summonerIds.join(",");

			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.5/league/by-summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: summonerIds
				}
			});
		},
		// Get league entries mapped by summoner ID for a given list of summoner IDs.
		bySummonerEntry: (callback, summonerIds, options) => {
			if(Array.isArray(summonerIds))
				summonerIds = summonerIds.join(",");

			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.5/league/by-summoner/${summonerIds}/entry",
				pathParameters: {
					region: options.region,
					summonerIds: summonerIds
				}
			});
		},
		// Get leagues mapped by team ID for a given list of team IDs.
		byTeam: (callback, teamIds, options) => {
			if(Array.isArray(teamIds))
				teamIds = teamIds.join(",");

			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.5/league/by-team/${teamIds}",
				pathParameters: {
					region: options.region,
					teamIds: teamIds
				}
			});
		},
		// Get league entries mapped by team ID for a given list of team IDs.
		byTeamEntry: (callback, teamIds, options) => {
			if(Array.isArray(teamIds))
				teamIds = teamIds.join(",");

			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.5/league/by-team/${teamIds}/entry",
				pathParameters: {
					region: options.region,
					teamIds: teamIds
				}
			});
		},
		// Get challenger tier leagues
		challenger: (callback, type, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "league/challenger_" + options.region,
				path: "/api/lol/${region}/v2.5/league/challenger",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					type: type
				}
			});
		},
		// Get master tier leagues.
		master: (callback, type, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "league/master_" + options.region,
				path: "/api/lol/${region}/v2.5/league/master",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					type: type
				}
			});
		}
	},
	/**
	 * Gets static information about the game like a current detailed champion list,
	 * runes, masteries, items, language data, summoner spells and version. Not rate
	 * limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1055
	 * Cached: Default on
	 */
	static_data: {
		// Retrieves champion list.
		championAll: (callback, locale, version, dataById, champData, options) => {
			var cacheIdentifier = "static/" + options.region + "/champions/champions";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(dataById)
				cacheIdentifier += "_by_id";

			if(Array.isArray(champData))
				cacheIdentifier += "_" + champData.join("-");

			cacheIdentifier += "_" + options.region;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/champion",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					locale: locale,
					version: version,
					dataById: dataById,
					champData: Array.isArray(champData) ? champData.join(",") : undefined
				}
			});
		},
		// Retrieves a champion by its id.
		championOne: (callback, id, locale, version, champData, options) => {
			var cacheIdentifier = "static/" + options.region + "/champions/champion/" + id;
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(champData))
				cacheIdentifier += "_" + champData.join("-");

			cacheIdentifier += "_" + options.region;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/champion/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: {
					locale: locale,
					version: version,
					champData: Array.isArray(champData) ? champData.join(",") : undefined
				}
			});
		},
		// Retrieves item list.
		itemAll: (callback, locale, version, itemListData, options) => {
			var cacheIdentifier = "static/" + options.region + "/items/items";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(itemListData))
				cacheIdentifier += "_" + itemListData.join("-");

			cacheIdentifier += "_" + options.region;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/item",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					locale: locale,
					version: version,
					itemListData: Array.isArray(itemListData) ? itemListData.join(",") : undefined
				}
			});
		},
		// Retrieves item by its unique id
		itemOne: (callback, id, locale, version, itemData, options) => {
			var cacheIdentifier = "static/" + options.region + "/items/item/" + id;
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(itemData))
				cacheIdentifier += "_" + itemData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/item/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: {
					locale: locale,
					version: version,
					itemData: Array.isArray(itemData) ? itemData.join(",") : undefined
				}
			});
		},
		// Retrieve language strings data
		languageStrings: (callback, locale, version, options) => {
			var cacheIdentifier = "static/" + options.region + "/language/strings/strings";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/language-strings",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					locale: locale,
					version: version
				}
			});
		},
		// Retrieve supported languages data.
		languages: (callback, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "static/" + options.region + "/language/languages",
				path: "/api/lol/static-data/${region}/v1.2/languages",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieve map data.
		map: (callback, locale, version, options) => {
			var cacheIdentifier = "static/" + options.region + "/map";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/map",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					locale: locale,
					version: version
				}
			});
		},
		// Retrieves mastery list.
		mastery: (callback, locale, version, masteryListData, options) => {
			var cacheIdentifier = "static/" + options.region + "/mastery/masteries";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(masteryListData))
				cacheIdentifier += "_" + masteryListData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/mastery",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					locale: locale,
					version: version,
					masteryListData: Array.isArray(masteryListData) ? masteryListData.join(",") : undefined
				}
			});
		},
		masteryById: (callback, id, locale, version, masteryData, options) => {
			var cacheIdentifier = "static/" + options.region + "/mastery/mastery/" + id;
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(masteryData))
				cacheIdentifier += "_" + masteryData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/mastery/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: {
					locale: locale,
					version: version,
					masteryData: masteryData
				}
			});
		},
		// Retrieve realm data, including CDN paths for web assets.
		realm: (callback, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "/static/" + options.region + "/realm",
				path: "/api/lol/static-data/${region}/v1.2/realm",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieves rune list.
		rune: (callback, locale, version, runeListData, options) => {
			var cacheIdentifier = "static/" + options.region + "/runes/runes";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(runeListData))
				cacheIdentifier += "_" + runeListData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/rune",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					runeListData: Array.isArray(runeListData) ? runeListData.join(",") : undefined,
					locale: locale,
					version: version
				}
			});
		},
		// Retrieves rune by its unique id.
		runeById: (callback, id, locale, version, runeData, options) => {
			var cacheIdentifier = "static/" + options.region + "/runes/rune/" + id;
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(runeData))
				cacheIdentifier += "_" + runeData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/rune/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: {
					runeListData: Array.isArray(runeData) ? runeData.join(",") : undefined,
					locale: locale,
					version: version
				}
			});
		},
		// Retrieves summoner spell list.
		summonerSpell: (callback, locale, version, dataById, spellData, options) => {
			var cacheIdentifier = "static/" + options.region + "/summoner_spells/spells";
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(spellData))
				cacheIdentifier += "_" + spellData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/summoner-spell",
				pathParameters: {
					region: options.region
				},
				queryParameters: {
					spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
					dataById: dataById,
					locale: locale,
					version: version
				}
			});
		},
		// Retrieves summoner spell by its unique id.
		summonerSpellById: (callback, id, locale, version, spellData, options) => {
			var cacheIdentifier = "static/" + options.region + "/summoner_spells/spell/" + id;
			if(typeof locale === "string")
				cacheIdentifier += "_" + locale;

			if(typeof version === "string")
				cacheIdentifier += "_" + version;

			if(Array.isArray(spellData))
				cacheIdentifier += "_" + spellData.join("-");

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/static-data/${region}/v1.2/summoner-spell/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: {
					spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
					locale: locale,
					version: version
				}
			});
		},
		// Retrieve version data.
		versions: (callback, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "/static/" + options.region + "/versions",
				path: "/api/lol/static-data/${region}/v1.2/versions",
				pathParameters: {
					region: options.region
				}
			});
		}
	},
	/**
	 * Gets server status by region. Not rate limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/908
	 * Cache: Varies
	 */
	status: {
		// Get shard list.
		getAllShards: (callback, options) => {
			requestor(callback, {
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "/shards/" + options.region + "/shards",
				fullPath: "http://status.leagueoflegends.com/shards"
			});
		},
		// Get shard status. Returns the data available on the status.leagueoflegends.com website for the given region.
		getOneShard: (callback, options) => {
			requestor(callback, {
				fullPath: "http://status.leagueoflegends.com/shards/" + options.region
			});
		}
	},
	/**
	 * Detailed information about a match, or as part of a tournament.
	 * Timeline information not available for all matches.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1064
	 * Cache: Default on
	 */
	match: (callback, matchId, includeTimeline, options) => {
		requestor(callback, {
			region: options.region,
			cache: options.cache === undefined ? true : options.cache,
			cacheIdentifier: "/match/" + options.region + "/" + matchId + (includeTimeline ? "_timeline" : ""),
			path: "/api/lol/${region}/v2.2/match/${matchId}",
			pathParameters: {
				region: options.region,
				matchId: matchId
			},
			queryParameters: {
				includeTimeline: includeTimeline
			}
		});
	},
	/**
	 * Get a list of matches for a given summoner ID. Includes timestamps,
	 * IDs, season, region, role, etc.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1069
	 * Cache: Default on
	 */
	matchList: (callback, summonerId, championIds, rankedQueues, seasons, beginTime, endTime, beginIndex, endIndex, options) => {
		requestor(callback, {
			region: options.region,
			cache: options.cache === undefined ? true : options.cache,
			cacheIdentifier: "/matchlist/" + options.region + "/" + summonerId,
			path: "/api/lol/${region}/v2.2/matchlist/by-summoner/${summonerId}",
			pathParameters: {
				region: options.region,
				summonerId: summonerId
			},
			queryParameters: {
				championIds: Array.isArray(championIds) ? championIds.join(",") : undefined,
				rankedQueues: rankedQueues,
				seasons: seasons,
				beginTime: beginTime,
				endTime: endTime,
				beginIndex: beginIndex,
				endIndex: endIndex
			}
		});
	},
	/**
	 * Ranked or unranked match history for a given summoner ID.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1080
	 * Cache: Default on
	 */
	stats: {
		// Get ranked stats by summoner ID.
		ranked: (callback, summonerId, season, version, options) => {
			var cacheIdentifier = "/stats/" + options.region + "/ranked/" + summonerId;
			if(season !== undefined)
				cacheIdentifier += "_" + season;

			if(version !== undefined)
				cacheIdentifier += "_" + version;

			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: cacheIdentifier,
				path: "/api/lol/${region}/v1.3/stats/by-summoner/${summonerId}/ranked",
				pathParameters: {
					region: options.region,
					summonerId: summonerId
				},
				queryParameters: {
					season: season,
					version: version
				}
			});
		},
		// Get player stats summaries by summoner ID.
		summary: (callback, summonerId, season, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === undefined ? true : options.cache,
				cacheIdentifier: "/stats/" + options.region + "/summary/" + summonerId + (season === undefined ? "" : "_" + season),
				path: "/api/lol/${region}/v1.3/stats/by-summoner/${summonerId}/summary",
				pathParameters: {
					region: options.region,
					summonerId: summonerId
				},
				queryParameters: {
					season: season
				}
			});
		}
	},
	/**
	 * Resolve a summoner name to an ID and vise versa, as well as the
	 * mastery and rune pages for a profile.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/3724
	 * Cache: Varies
	 */
	summoner: {
		// Get summoner objects mapped by standardized summoner name for a given list of summoner names.
		byName: (callback, summonerNames, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v1.4/summoner/by-name/${summonerNames}",
				pathParameters: {
					region: options.region,
					summonerNames: Array.isArray(summonerNames) ? summonerNames.join(",") : undefined
				}
			});
		},
		// Get summoner objects mapped by summoner ID for a given list of summoner IDs.
		byId: (callback, summonerIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get mastery pages mapped by summoner ID for a given list of summoner IDs
		masteries: (callback, summonerIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}/masteries",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get summoner names mapped by summoner ID for a given list of summoner IDs.
		names: (callback, summonerIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}/name",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get rune pages mapped by summoner ID for a given list of summoner IDs.
		runes: (callback, summonerIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}/runes",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		}
	},
	/**
	 * Resolve a summoner name to an ID and vise versa, as well as the
	 * mastery and rune pages for a profile.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/986
	 * 
	 * Cache: Disabled
	 */
	team: {
		// Get teams mapped by summoner ID for a given list of summoner IDs.
		// /!\ Not tested - couldn't get the team I was on with a request.
		bySummoner: (callback, summonerIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.4/team/by-summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get teams mapped by team ID for a given list of team IDs.
		// /!\ Not tested - couldn't get the team I was on with a request.
		byId: (callback, teamIds, options) => {
			requestor(callback, {
				region: options.region,
				path: "/api/lol/${region}/v2.4/team/${teamIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(teamIds) ? teamIds.join(",") : undefined
				}
			});
		}
	}
	/*
	 * Allows for the external management of organized tournaments.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1057
	 *
	 * Disappeared as of May 4th, 2016
	 *
	tournamentProvider: {
		// Create a tournament code for the given tournament.
		createCode: (callback, tournamentId, count, data, options) => {

		},
		// Returns the tournament code DTO associated with a tournament code string.
		getByCode: (callback, tournamentCode, options) => {

		},
		// Update the pick type, map, spectator type, or allowed summoners for a code
		update: (callback, tournamentCode, data, options) => {

		},
		// Gets a list of lobby events by tournament code.
		listByCode: (callback, tournamentCode, options) => {

		},
		// Creates a tournament provider and returns its ID.
		createProvider: (callback, data, options) => {

		},
		// Creates a tournament and returns its ID.
		createTournament: (callback, data, options) => {

		}
	}
	*/
};