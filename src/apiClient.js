/*
 * Abstraction layer for Riot Games API in ES6. v1 (11pm on a Monday!)
 * Features:
 *   - Translates the REST requests used by the API into native JS functions.
 *   - Caches one-off requests as well as more static data (e.g. regions or champions)
 *   - Handles rate limits and queues requests as needed (todo: do better without waiting for riot's apis to lock us out)
 *   - Reuses data when available (e.g. if we've retrieved all champion data, then this
 *   ask for a specific champion by ID, return the result from the bigger cache).
 *
 * Cache files can normally be found in .cache and are saved for one day.
 * This behavior can be changed by modifying config.json.
 *
 * Last updated: May 3rd, 2016
 */

/*
 * Implementation notes:
 * Pass the region for each request in the options object. Caching can be configured
 * there too. In most cases, the name of the endpoint in Riot's API documentation
 * corresponds to the function here, however multiple words are separated by underscores
 * for consistency. Top-level endpoints are objects unless they only have one child,
 * in which case they're a function. Enjoy! :)
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
	hitOr: (callback, id, on_miss) => {
		if(CacheEngine.data[id])
			return callback(CacheEngine.data[id]);

		fs.readJSON(global.user_config.get("cache.directory") + "/" + id + ".json", "utf8", (err, data) => {
			if(err) {
				on_miss((data) => {
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

var requestor = (callback, info) => {
	var retrieve = (callback) => {
		var args = {
			path: info.path_parameters || {},
			parameters: info.url_parameters
		};

		args.parameters.api_key = global.user_config.get("credentials.riot_api_key");

		var req = client[info.method || "get"]("https://" + regionData[info.region].host + info.path, args, (data, response) => {
			if(response.statusCode !== 200) {
				var callback_reply = {
					type: "error",
					code: response.statusCode
				};

				switch(response.statusCode) {
					case 400:
						callback_reply.text = "Bad request.";
					break;
					case 401:
						callback_reply.text = "Authorization failure.";
						console.warn("Warning: Received an authentication error from Riot's API servers. Make sure your API key is correct.");
					break;
					case 404:
						callback_reply.text = "Resource not found.";
					break;
					case 429:
						return setTimeout(() => retrieve(callback), (response.headers["Retry-After"] * 1000)); // todo: handle this better
					break;
					case 500:
						callback_reply.text = "The API encountered an internal server error.";
					break;
				}

				callback(callback_reply);
			} else
				callback(data);
		});

		req.on('requestTimeout', (req) => {
			callback({
				tyep: "error",
				text: "The request timed out before it could be executed. This implies an error with the machine - check you have available sockets."
			});
			req.abort();
		});

		req.on('responseTimeout', (res) => {
			callback({
				tyep: "error",
				text: "The request to the API server timed out. You can check the status of pvp.net servers at http://status.leagueoflegends.com/."
			});
		});

		req.on('error', (err) => {
			callback({
				tyep: "error",
				text: "Internal error before the request could be made: " + err
			});
		});
	};

	if(info.cache && info.cache_identifier)
		CacheEngine.hitOr(callback, info.cache_identifier, retrieve);
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
	 */
	champion: {
		// Retrieve champion by ID.
		getOne: (callback, id, options) => {
			requestor(callback, {
				region: options.region,
				cache: options.cache === true,
				path: "/api/lol/${region}/v1.2/champion/${id}",
				path_parameters: {
					region: options.region,
					id: id
				},
				url_parameters: {},
				cache_identifier: "champion/" + id
			});
		},
		// Retrieve all champions.
		getAll: (callback, freeToPlay, options) => {

		}
	},
	/**
	 * Information about a summoner's champion mastery, a statistic that increments as they
	 * play more matches as a specific champion. Scores for individual champions can be
	 * requested, or the full list can be obtained.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1071
	 */
	championMastery: {
		// Get a champion mastery by player id and champion id. Response code 204 means there were no masteries found for given player id or player id and champion id combination.
		getOne: (callback, summonerId, championId, options) => {

		},
		// Get all champion mastery entries sorted by number of champion points descending.
		getAll: (callback, summonerId, options) => {

		},
		// Get a player's total champion mastery score, which is sum of individual champion mastery levels.
		score: (callback, summonerId, options) => {

		},
		// Get specified number of top champion mastery entries sorted by number of champion points descending.
		topChampions: (callback, summonerId, count, options) => {

		}
	},
	/**
	 * If the summoner is currently in a game, this endpoint returns information about the
	 * current state of that game: Other participants, bans, time and gamemode are among the
	 * returned information.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/976
	 */
	currentGame: (callback, summonerId, options) => {

	},
	/**
	 * Lists summary information about featured games, as they are shown in the lower right
	 * of the pvp.net client's homepage.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/977
	 */
	featuredGames: (callback, options) => {

	},
	/**
	 * Gets a list of recent matches played by a given summoner ID. Detailed information
	 * includes that similar to that which is shown at the end-of-game screen.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1078
	 */
	game: (callback, summonerIds, options) => {

	},
	/**
	 * Ranked information by summoner, team, or list tiers for upper
	 * levels (challenger/master). Shows participants in a league.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/985
	 */
	league: {
		// Get leagues mapped by summoner ID for a given list of summoner IDs.
		bySummoner: (callback, summonerIds, options) => {

		},
		// Get league entries mapped by summoner ID for a given list of summoner IDs.
		bySummonerEntry: (callback, summonerIds, options) => {

		},
		// Get leagues mapped by team ID for a given list of team IDs.
		byTeam: (callback, teamIds, options) => {

		},
		// Get league entries mapped by team ID for a given list of team IDs.
		byTeamEntry: (callback, teamIds, options) => {

		},
		// Get challenger tier leagues
		challenger: (callback, type, options) => {

		},
		// Get master tier leagues.
		master: (callback, type, options) => {

		}
	},
	/**
	 * Gets static information about the game like a current defailed champion list,
	 * runes, masteries, items, language data, summoner spells and version. Not rate
	 * limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1055
	 */
	static_data: {
		// Retrieves champion list.
		championAll: (callback, locale, version, dataById, champData, options) => {

		},
		// Retrieves a champion by its id.
		championOne: (callback, id, locale, version, champData, options) => {

		},
		// Retrieves item list.
		itemAll: (callback, locale, version, itemListData, options) => {

		},
		// Retrieves item by its unique id
		itemOne: (callback, id, locale, version, itemData, options) => {

		},
		// Retrieve language strings data
		languageStrings: (callback, locale, version, options) => {

		},
		// Retrieve supported languages data.
		languages: (callback, options) => {

		},
		// Retrieve map data.
		map: (callback, locale, version, options) => {

		},
		// Retrieves mastery list.
		mastery: (callback, locale, version, masteryListData, options) => {

		},
		// Retrieve realm data.
		realm: (callback, options) => {

		},
		// Retrieves rune list.
		rune: (callback, locale, version, runeListData, options) => {

		},
		// Retrieves rune by its unique id.
		runeById: (callback, id, locale, version, runeData, options) => {

		},
		// Retrieves summoner spell list.
		summonerSpell: (callback, locale, version, dataById, spellData, options) => {

		},
		// Retrieves summoner spell by its unique id.
		summonerSpellById: (callback, id, locale, version, spellData, options) => {

		},
		// Retrieve version data.
		versions: (callback, options) => {

		}
	},
	/**
	 * Gets server status by region. Not rate limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/908
	 */
	status: {
		// Get shard list.
		getAllShards: (callback, options) => {

		},
		// Get shard status. Returns the data available on the status.leagueoflegends.com website for the given region.
		getOneShard: (callback, options) => {

		}
	},
	/**
	 * Detailed information about a match, or as part of a tournament.
	 * Timeline information not available for all matches.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1064
	 */
	match: {
		// Retrieve match IDs by tournament code.
		byTournament: (callback, tournamentCode, options) => {

		},
		// Retrieve match by match ID and tournament code.
		forTournament: (callback, match_id, tournamentCode, includeTimeline, options) => {

		},
		// Retrieve match by match ID.
		match: (callback, match_id, includeTimeline, options) => {

		}
	},
	/**
	 * Get a list of matches for a given summoner ID. Includes timestamps,
	 * IDs, season, region, role, etc.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1069
	 */
	matchList: (callback, summonerId, championIds, rankedQueues, seasons, beginTime, endTime, beginIndex, endIndex, options) => {

	},
	/**
	 * Ranked or unranked match history for a given summoner ID.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1080
	 */
	stats: {
		// Get ranked stats by summoner ID.
		ranked: (callback, summonerId, season, version, options) => {

		},
		// Get player stats summaries by summoner ID.
		summary: (callback, summonerId, season, options) => {

		}
	},
	/**
	 * Resolve a summoner name to an ID and vise versa, as well as the
	 * mastery and rune pages for a profile.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/3724
	 */
	summoner: {
		// Get summoner objects mapped by standardized summoner name for a given list of summoner names.
		byName: (callback, summonerNames, options) => {

		},
		// Get summoner objects mapped by summoner ID for a given list of summoner IDs.
		byId: (callback, summonerIds, options) => {

		},
		// Get mastery pages mapped by summoner ID for a given list of summoner IDs
		masteries: (callback, summonerIds, options) => {

		},
		// Get summoner names mapped by summoner ID for a given list of summoner IDs.
		names: (callback, summonerIds, options) => {

		},
		// Get rune pages mapped by summoner ID for a given list of summoner IDs.
		runes: (callback, summonerIds, options) => {

		}
	},
	/**
	 * Resolve a summoner name to an ID and vise versa, as well as the
	 * mastery and rune pages for a profile.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/986
	 */
	team: {
		// Get teams mapped by summoner ID for a given list of summoner IDs.
		bySummoner: (callback, summonerIds, options) => {

		},
		// Get teams mapped by team ID for a given list of team IDs.
		byId: (callback, teamIds, options) => {

		}
	},
	/**
	 * Allows for the external management of organized tournaments.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1057
	 */
	tournament_provider: {
		// Create a tournament code for the given tournament.
		createCode: (callback, tournament_id, count, data, options) => {

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
};