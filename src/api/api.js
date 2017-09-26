/*
 * Abstraction layer for Riot Games API in ES6.
 * Features:
 *   - Translates the REST requests used by the API into native JS functions.
 *   - Caches one-off requests as well as more static data (e.g. regions or champions)
 *   - Handles rate limits and queues requests as needed
 *
 * Cache files can normally be found in .cache and are saved for one day.
 * This behavior can be changed by modifying config.json.
 *
 * Last updated: May 4th, 2016. All endpoints were tested at time of writing.
 */

/*
 * Implementation notes:
 * Pass the region for each request in the options object. Caching can be configured
 * as a boolean there as well. To skip a parameter, pass a value of undefined.
 * In most cases, the name of the endpoint in Riot's API documentation corresponds
 * to the function here, however all are camel case. Top-level endpoints are objects
 * unless they only have one child, in which case they're a function. Enjoy! :)
 */

const client = require("./client"),
	  cache = require("./cache"),
	  request = client.request,
	  regions = client.regions;

let cacheTimes = cache.times;
cache.engine.addInitEventHandler(times => {
	cacheTimes = times;
});

module.exports = {
	/**
	 * The state of champions, including whether they are active, enabled for
	 * ranked play, in the free champion rotation, or available in bot games.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1077
	 */
	champion: {
		// Retrieve champion by ID.
		getOne(callback, id, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "champion/" + id,
					expires: cacheTimes.VERY_LONG
				},
				path: "/lol/v3/champion/${id}",
				pathParameters: {
					region: options.region,
					id
				}
			});
		},
		// Retrieve all champions.
		getAll(callback, freeToPlay, options) {
			// If cache isn't set, this request won't be cached with the freeToPlay option set to true.
			// When the rotation is cached, it's saved under a different file (champion_ftp.json).
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "champions",
					expires: freeToPlay ? cacheTimes.VERY_LONG : cacheTimes.LONG,
					params: {
						freeToPlay: freeToPlay
					}
				},
				path: "/lol/v3/champions",
				pathParameters: {
					region: options.region
				},
				queryParameters: { freeToPlay }
			});
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
		getOne(callback, summonerId, championId, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "/lol/champion-mastery/v3/champion-masteries/by-summoner/${summonerId}/by-champion/${championId}",
					expires: cacheTimes.MEDIUM
				},
				pathParameters: {
					platformId: regions[options.region].id,
					summonerId,
					championId
				}
			});
		},
		// Get all champion mastery entries sorted by number of champion points descending.
		getAll(callback, accountId, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + accountId + "/championMastery/all",
					expires: cacheTimes.MEDIUM
				},
				path: "/lol/champion-mastery/v3/champion-masteries/by-summoner/${accountId}",
				pathParameters: {
					platformId: regions[options.region].id,
					accountId
				}
			});
		},
		// Get a player's total champion mastery score, which is sum of individual champion mastery levels.
		score(callback, summonerId, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/championMastery/score",
					expires: cacheTimes.MEDIUM
				},
				path: "/champion-mastery/v3/location/${platformId}/player/${accountId}/score",
				pathParameters: {
					platformId: regions[options.region].id,
					accountId: summonerId
				}
			});
		},
		// Get specified number of top champion mastery entries sorted by number of champion points descending.
		topChampions(callback, accountId, count, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + accountId + "/championMastery/top",
					expires: cacheTimes.MEDIUM,
					params: { count }
				},
				path: "/lol/champion-mastery/v3/scores/by-summoner/${accountId}",
				pathParameters: {
					platformId: regions[options.region].id,
					accountId
				},
				queryParameters: { count }
			});
		}
	},
	/**
	 * If the summoner is currently in a game, this endpoint returns information about the
	 * current state of that game: Other participants, bans, time and gamemode are among the
	 * returned information.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/976
	 */
	currentGame(callback, summonerId, options) {
		request(callback, {
			region: options.region,
			path: "/observer-mode/rest/consumer/getSpectatorGameInfo/${platformId}/${summonerId}",
			pathParameters: {
				platformId: regions[options.region].id,
				summonerId
			}
		});
	},
	/**
	 * Lists summary information about featured games, as they are shown in the lower right
	 * of the pvp.net client's homepage.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/977
	 */
	featuredGames(callback, options) {
		request(callback, {
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "featured_games",
				expires: cacheTimes.SHORT
			},
			region: options.region,
			path: "/observer-mode/rest/featured"
		});
	},
	/**
	 * Lists recently played matches for a given summoner ID. Detailed information
	 * includes that similar to that which is shown at the end-of-game screen.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1078
	 */
	game(callback, summonerId, options) {
		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "summoner/" + summonerId + "/games",
				expires: cacheTimes.MEDIUM
			},
			path: "/lol/v1.3/game/by-summoner/${summonerId}/recent",
			pathParameters: {
				region: options.region,
				summonerId
			}
		});
	},
	/**
	 * Ranked information by summoner, team, or list tiers for upper
	 * levels (challenger/master). Shows participants in a league.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/985
	 */
	league: {
		// Get leagues mapped by summoner ID for a given list of summoner IDs.
		bySummoner(callback, summonerIds, options) {
			if(Array.isArray(summonerIds))
				summonerIds = summonerIds.join(",");

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/{dynamic_id}",
					dynamic_id: summonerIds,
					expires: cacheTimes.MEDIUM
				},
				region: options.region,
				path: "/lol/v2.5/league/by-summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds
				}
			});
		},
		// Get league entries mapped by summoner ID for a given list of summoner IDs.
		bySummonerEntry(callback, summonerIds, options) {
			if(Array.isArray(summonerIds))
				summonerIds = summonerIds.join(",");

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/entry/{dynamic_id}",
					dynamic_id: summonerIds,
					expires: cacheTimes.MEDIUM
				},
				region: options.region,
				path: "/lol/v2.5/league/by-summoner/${summonerIds}/entry",
				pathParameters: {
					region: options.region,
					summonerIds
				}
			});
		},
		// Get leagues mapped by team ID for a given list of team IDs.
		byTeam(callback, teamIds, options) {
			if(Array.isArray(teamIds))
				teamIds = teamIds.join(",");

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league_team/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.MEDIUM
				},
				region: options.region,
				path: "/lol/v2.5/league/by-team/${teamIds}",
				pathParameters: {
					region: options.region,
					teamIds
				}
			});
		},
		// Get league entries mapped by team ID for a given list of team IDs.
		byTeamEntry(callback, teamIds, options) {
			if(Array.isArray(teamIds))
				teamIds = teamIds.join(",");

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league_team/entry/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.MEDIUM
				},
				region: options.region,
				path: "/lol/v2.5/league/by-team/${teamIds}/entry",
				pathParameters: {
					region: options.region,
					teamIds
				}
			});
		},
		// Get challenger tier leagues
		challenger(callback, type, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/challenger",
					expires: cacheTimes.MEDIUM,
					params: { type }
				},
				path: "/lol/v2.5/league/challenger",
				pathParameters: {
					region: options.region
				},
				queryParameters: { type }
			});
		},
		// Get master tier leagues.
		master(callback, type, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/master",
					expires: cacheTimes.MEDIUM,
					params: { type }
				},
				path: "/lol/v2.5/league/master",
				pathParameters: {
					region: options.region
				},
				queryParameters: { type }
			});
		}
	},
	/**
	 * Gets static information about the game like a current detailed champion list,
	 * runes, masteries, items, language data, summoner spells and version. Not rate
	 * limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1055
	 */
	static_data: {
		// Retrieves champion list.
		championAll(callback, locale, version, dataById, champData, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/champions",
					expires: cacheTimes.VERY_LONG
				},
				path: "/lol/static-data/v3/champions?locale=en_US&dataById=" + dataById + "&tags=" + champData.join("&tags="),
				pathParameters: false,
				queryParameters: false
			});
		},
		// Retrieves a champion by its id.
		championOne(callback, id, locale, version, champData, options) {
			const params = {
				locale: locale,
				version: version,
				champData: Array.isArray(champData) ? champData.join(",") : undefined
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/champions/" + id,
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/champion/${id}",
				pathParameters: {
					region: options.region,
					id
				},
				queryParameters: params
			});
		},
		// Retrieves item list.
		itemAll(callback, locale, version, itemListData, options) {
			const params = {
				itemListData: Array.isArray(itemListData) ? itemListData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/items",
					expires: cacheTimes.VERY_LONG,
					params
				},
				path: "/lol/static-data/v3/item",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves item by its unique id
		itemOne(callback, id, locale, version, itemData, options) {
			const params = {
				itemData: Array.isArray(itemData) ? itemData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/items/" + id,
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/item/${id}",
				pathParameters: {
					region: options.region,
					id
				},
				queryParameters: params
			});
		},
		// Retrieve language strings data
		languageStrings(callback, locale, version, options) {
			const params = { locale, version };

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/language/strings",
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/language-strings",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieve supported languages data.
		languages(callback, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/language/supported",
					expires: cacheTimes.VERY_LONG
				},
				path: "/lol/static-data/v3/languages",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieve map data.
		map(callback, locale, version, options) {
			const params = { locale, version };

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/map",
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/map",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves mastery list.
		mastery(callback, locale, version, masteryListData, options) {
			const params = {
				masteryListData: Array.isArray(masteryListData) ? masteryListData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/masteries",
					expires: cacheTimes.VERY_LONG,
					params
				},
				path: "/lol/static-data/v3/mastery",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		masteryById(callback, id, locale, version, masteryData, options) {
			const params = { locale, version, masteryData };

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/masteries/" + id,
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/mastery/${id}",
				pathParameters: {
					region: options.region,
					id
				},
				queryParameters: params
			});
		},
		// Retrieve realm data, including CDN paths for web assets.
		realm(callback, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/realms",
					expires: cacheTimes.VERY_LONG
				},
				path: "/lol/static-data/v3/realms",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieves rune list.
		rune(callback, locale, version, runeListData, options) {
			const params = {
				runeListData: Array.isArray(runeListData) ? runeListData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/runes",
					expires: cacheTimes.VERY_LONG,
					params
				},
				path: "/lol/static-data/v3/rune",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves rune by its unique id.
		runeById(callback, id, locale, version, runeData, options) {
			const params = {
				runeListData: Array.isArray(runeData) ? runeData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/runes/" + id,
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/lol/static-data/v3/rune/${id}",
				pathParameters: {
					region: options.region,
					id
				},
				queryParameters: params
			});
		},
		// Retrieves summoner spell list.
		summonerSpell(callback, locale, version, dataById, spellData, options) {
			const params = {
				spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
				dataById, locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/summoner_spells",
					expires: cacheTimes.VERY_LONG,
					params
				},
				path: "/lol/static-data/v3/summoner-spell",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves summoner spell by its unique id.
		summonerSpellById(callback, id, locale, version, spellData, options) {
			const params = {
				spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
				locale, version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/summoner_spells/" + id,
					expires: cacheTimes.LONG,
					params
				},
				path: "/lol/static-data/v3/summoner-spell/${id}",
				pathParameters: {
					region: options.region,
					id
				},
				queryParameters: params
			});
		},
		// Retrieve version data.
		versions(callback, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/versions",
					expires: cacheTimes.MEDIUM
				},
				path: "/lol/static-data/v3/versions",
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
	 */
	status: {
		// Get shard list.
		getAllShards(callback, options) {
			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					identifier: "shards",
					expires: cacheTimes.LONG
				},
				fullPath: "http://status.leagueoflegends.com/shards"
			});
		},
		// Get shard status. Returns the data available on the status.leagueoflegends.com website for the given region.
		getOneShard(callback, options) {
			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "shards",
					expires: cacheTimes.VERY_SHORT
				},
				fullPath: "http://status.leagueoflegends.com/shards/" + options.region
			});
		}
	},
	/**
	 * Detailed information about a match, or as part of a tournament.
	 * Timeline information not available for all matches.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1064
	 */
	match(callback, matchId, options) {
		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "matches/" + matchId,
				expires: cacheTimes.LONG
			},
			path: "/lol/match/v3/matches/{matchId}",
			pathParameters: {
				region: options.region,
				matchId
			},
			queryParameters: false
		});
	},
	/**
	 * Get a list of matches for a given summoner ID. Includes timestamps,
	 * IDs, season, region, role, etc.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1069
	 */
	matchList(callback, summonerId, championIds, rankedQueues, seasons, beginTime, endTime, beginIndex, endIndex, options) {
		const params = {
			championIds: Array.isArray(championIds) ? championIds.join(",") : undefined,
			rankedQueues, seasons, beginTime, endTime, beginIndex, endIndex
		};

		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "summoner/" + summonerId + "/matchList",
				expires: cacheTimes.SHORT,
				params
			},
			path: "/lol/v2.2/matchlist/by-summoner/${summonerId}",
			pathParameters: {
				region: options.region,
				summonerId
			},
			queryParameters: params
		});
	},
	/**
	 * Ranked or unranked match history for a given summoner ID.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1080
	 */
	matchlist: {
		// Get ranked stats by summoner ID.
		ranked(callback, accountId, season, version, options) {
			const params = { season, version };

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + accountId + "/stats/ranked",
					expires: cacheTimes.SHORT,
					params
				},
				path: "/lol/match/v3/matchlists/by-account/${accountId}",
				pathParameters: {
					region: options.region,
					accountId
				},
				queryParameters: params
			});
		},
		// Get player stats summaries by summoner ID.
		summary(callback, summonerId, season, options) {
			const params = { season: season };

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/stats/summary",
					expires: cacheTimes.SHORT,
					params
				},
				path: "/lol/v1.3/stats/by-summoner/${summonerId}/summary",
				pathParameters: {
					region: options.region,
					summonerId
				},
				queryParameters: params
			});
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
		byName(callback, summonerNames, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/name/{dynamic_id}/profile",
					dynamic_id: summonerNames,
					expires: cacheTimes.LONG
				},
				path: "/lol/summoner/v3/summoners/by-name/${summonerNames}",
				pathParameters: {
					region: options.region,
					summonerNames: Array.isArray(summonerNames) ? summonerNames.join(",") : undefined
				}
			});
		},
		// Get summoner objects mapped by summoner ID for a given list of summoner IDs.
		byId(callback, summonerIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/profile",
					dynamic_id: summonerIds,
					expires: cacheTimes.LONG
				},
				path: "/lol/v1.4/summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get mastery pages mapped by summoner ID for a given list of summoner IDs
		masteries(callback, summonerIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/masteries",
					dynamic_id: summonerIds,
					expires: cacheTimes.VERY_LONG
				},
				path: "/lol/v1.4/summoner/${summonerIds}/masteries",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get summoner names mapped by summoner ID for a given list of summoner IDs.
		names(callback, summonerIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/name",
					dynamic_id: summonerIds,
					expires: cacheTimes.LONG
				},
				path: "/lol/v1.4/summoner/${summonerIds}/name",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get rune pages mapped by summoner ID for a given list of summoner IDs.
		runes(callback, summonerIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/runes",
					dynamic_id: summonerIds,
					expires: cacheTimes.SHORT
				},
				path: "/lol/v1.4/summoner/${summonerIds}/runes",
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
	 */
	team: {
		// Get teams mapped by summoner ID for a given list of summoner IDs.
		bySummoner(callback, summonerIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "teams/bySummoner/{dynamic_id}",
					dynamic_id: summonerIds,
					expires: cacheTimes.SHORT
				},
				path: "/lol/v2.4/team/by-summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get teams mapped by team ID for a given list of team IDs.
		byId(callback, teamIds, options) {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "teams/byId/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.LONG
				},
				path: "/lol/v2.4/team/${teamIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(teamIds) ? teamIds.join(",") : undefined
				}
			});
		}
	}
};