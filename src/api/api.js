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
 * [x] Caching for queries that take multiple summoner ids
 * [ ] Cache higher levels (e.g. whole champion list -> individual champions)
 * [x] Cache expiration (including on individual endpoints)
 * [x] Anticipate rate limits
 * [x] Split into classes
 */

/*
 * Implementation notes:
 * Pass the region for each request in the options object. Caching can be configured
 * there too. To skip a parameter, pass a value of undefined. In most cases, the name
 * of the endpoint in Riot's API documentation corresponds to the function here.
 * Top-level endpoints are objects unless they only have one child, in which case
 * they're a function. Enjoy! :)
 */

var client = require("./client"),
	cacheTimes = require("./cache").times,
	request = client.request,
	regions = client.regions;

module.exports = {
	/**
	 * The state of champions, including whether they are active, enabled for
	 * ranked play, in the free champion rotation, or available in bot games.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1077
	 * Cached: Default on
	 */
	champion: {
		// Retrieve champion by ID.
		getOne: (callback, id, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "champion/" + id,
					expires: cacheTimes.VERY_LONG
				},
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
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/championMastery/byChampion/" + championId,
					expires: cacheTimes.MEDIUM
				},
				pathParameters: {
					platformId: regions[options.region].id,
					playerId: summonerId,
					championId: championId
				}
			});
		},
		// Get all champion mastery entries sorted by number of champion points descending.
		getAll: (callback, summonerId, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/championMastery/all",
					expires: cacheTimes.MEDIUM
				},
				path: "/championmastery/location/${platformId}/player/${playerId}/champions",
				pathParameters: {
					platformId: regions[options.region].id,
					playerId: summonerId
				}
			});
		},
		// Get a player's total champion mastery score, which is sum of individual champion mastery levels.
		score: (callback, summonerId, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/championMastery/score",
					expires: cacheTimes.MEDIUM
				},
				path: "/championmastery/location/${platformId}/player/${playerId}/score",
				pathParameters: {
					platformId: regions[options.region].id,
					playerId: summonerId
				}
			});
		},
		// Get specified number of top champion mastery entries sorted by number of champion points descending.
		topChampions: (callback, summonerId, count, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/championMastery/top",
					expires: cacheTimes.MEDIUM,
					params: {
						count: count
					}
				},
				path: "/championmastery/location/${platformId}/player/${playerId}/topchampions",
				pathParameters: {
					platformId: regions[options.region].id,
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
		request(callback, {
			region: options.region,
			path: "/observer-mode/rest/consumer/getSpectatorGameInfo/${platformId}/${summonerId}",
			pathParameters: {
				platformId: regions[options.region].id,
				summonerId: summonerId
			}
		});
	},
	/**
	 * Lists summary information about featured games, as they are shown in the lower right
	 * of the pvp.net client's homepage.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/977
	 * Cache: Default on
	 */
	featuredGames: (callback, options) => {
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
	 * Cache: Default on
	 */
	game: (callback, summonerId, options) => {
		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "summoner/" + summonerId + "/games",
				expires: cacheTimes.MEDIUM
			},
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
	 * Cache: Default on
	 */
	league: {
		// Get leagues mapped by summoner ID for a given list of summoner IDs.
		bySummoner: (callback, summonerIds, options) => {
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

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/entry/{dynamic_id}",
					dynamic_id: summonerIds,
					expires: cacheTimes.MEDIUM
				},
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

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league_team/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.MEDIUM
				},
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

			request(callback, {
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league_team/entry/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.MEDIUM
				},
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
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/challenger",
					expires: cacheTimes.MEDIUM,
					params: {
						type: type
					}
				},
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
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "league/master",
					expires: cacheTimes.MEDIUM,
					params: {
						type: type
					}
				},
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
			var params = {
				locale: locale,
				version: version,
				dataById: dataById,
				champData: Array.isArray(champData) ? champData.join(",") : undefined
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/champions",
					expires: cacheTimes.VERY_LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/champion",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves a champion by its id.
		championOne: (callback, id, locale, version, champData, options) => {
			var params = {
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
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/champion/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: params
			});
		},
		// Retrieves item list.
		itemAll: (callback, locale, version, itemListData, options) => {
			var params = {
				locale: locale,
				version: version,
				itemListData: Array.isArray(itemListData) ? itemListData.join(",") : undefined
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/items",
					expires: cacheTimes.VERY_LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/item",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves item by its unique id
		itemOne: (callback, id, locale, version, itemData, options) => {
			var params = {
				locale: locale,
				version: version,
				itemData: Array.isArray(itemData) ? itemData.join(",") : undefined
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/items/" + id,
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/item/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: params
			});
		},
		// Retrieve language strings data
		languageStrings: (callback, locale, version, options) => {
			var params = {
				locale: locale,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/language/strings",
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/language-strings",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieve supported languages data.
		languages: (callback, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/language/supported",
					expires: cacheTimes.VERY_LONG
				},
				path: "/api/lol/static-data/${region}/v1.2/languages",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieve map data.
		map: (callback, locale, version, options) => {
			var params = {
				locale: locale,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/map",
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/map",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves mastery list.
		mastery: (callback, locale, version, masteryListData, options) => {
			var params = {
				locale: locale,
				version: version,
				masteryListData: Array.isArray(masteryListData) ? masteryListData.join(",") : undefined
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/masteries",
					expires: cacheTimes.VERY_LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/mastery",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		masteryById: (callback, id, locale, version, masteryData, options) => {
			var params = {
				locale: locale,
				version: version,
				masteryData: masteryData
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/masteries/" + id,
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/mastery/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: params
			});
		},
		// Retrieve realm data, including CDN paths for web assets.
		realm: (callback, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/realm",
					expires: cacheTimes.VERY_LONG
				},
				path: "/api/lol/static-data/${region}/v1.2/realm",
				pathParameters: {
					region: options.region
				}
			});
		},
		// Retrieves rune list.
		rune: (callback, locale, version, runeListData, options) => {
			var params = {
				runeListData: Array.isArray(runeListData) ? runeListData.join(",") : undefined,
				locale: locale,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/runes",
					expires: cacheTimes.VERY_LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/rune",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves rune by its unique id.
		runeById: (callback, id, locale, version, runeData, options) => {
			var params = {
				runeListData: Array.isArray(runeData) ? runeData.join(",") : undefined,
				locale: locale,
				version: version
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
				path: "/api/lol/static-data/${region}/v1.2/rune/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: params
			});
		},
		// Retrieves summoner spell list.
		summonerSpell: (callback, locale, version, dataById, spellData, options) => {
			var params = {
				spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
				dataById: dataById,
				locale: locale,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/summoner_spells",
					expires: cacheTimes.VERY_LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/summoner-spell",
				pathParameters: {
					region: options.region
				},
				queryParameters: params
			});
		},
		// Retrieves summoner spell by its unique id.
		summonerSpellById: (callback, id, locale, version, spellData, options) => {
			var params = {
				spellData: Array.isArray(spellData) ? spellData.join(",") : undefined,
				locale: locale,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/summoner_spells/" + id,
					expires: cacheTimes.LONG,
					params: params
				},
				path: "/api/lol/static-data/${region}/v1.2/summoner-spell/${id}",
				pathParameters: {
					region: options.region,
					id: id
				},
				queryParameters: params
			});
		},
		// Retrieve version data.
		versions: (callback, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "static/versions",
					expires: cacheTimes.MEDIUM
				},
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
	 * Cache: Default on
	 */
	status: {
		// Get shard list.
		getAllShards: (callback, options) => {
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
		getOneShard: (callback, options) => {
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
	 * Cache: Default on
	 */
	match: (callback, matchId, includeTimeline, options) => {
		var params = {
			includeTimeline: includeTimeline
		};

		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "matches/" + matchId,
				expires: cacheTimes.LONG,
				params: params
			},
			path: "/api/lol/${region}/v2.2/match/${matchId}",
			pathParameters: {
				region: options.region,
				matchId: matchId
			},
			queryParameters: params
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
		var params = {
			championIds: Array.isArray(championIds) ? championIds.join(",") : undefined,
			rankedQueues: rankedQueues,
			seasons: seasons,
			beginTime: beginTime,
			endTime: endTime,
			beginIndex: beginIndex,
			endIndex: endIndex
		};

		request(callback, {
			region: options.region,
			cache: {
				enabled: options.cache !== undefined ? options.cache : true,
				region: options.region,
				identifier: "summoner/" + summonerId + "/matchList",
				expires: cacheTimes.SHORT,
				params: params
			},
			path: "/api/lol/${region}/v2.2/matchlist/by-summoner/${summonerId}",
			pathParameters: {
				region: options.region,
				summonerId: summonerId
			},
			queryParameters: params
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
			var params = {
				season: season,
				version: version
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/stats/ranked",
					expires: cacheTimes.SHORT,
					params: params
				},
				path: "/api/lol/${region}/v1.3/stats/by-summoner/${summonerId}/ranked",
				pathParameters: {
					region: options.region,
					summonerId: summonerId
				},
				queryParameters: params
			});
		},
		// Get player stats summaries by summoner ID.
		summary: (callback, summonerId, season, options) => {
			var params = {
				season: season
			};

			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/" + summonerId + "/stats/summary",
					expires: cacheTimes.SHORT,
					params: params
				},
				path: "/api/lol/${region}/v1.3/stats/by-summoner/${summonerId}/summary",
				pathParameters: {
					region: options.region,
					summonerId: summonerId
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
	 * Cache: Varies
	 */
	summoner: {
		// Get summoner objects mapped by standardized summoner name for a given list of summoner names.
		byName: (callback, summonerNames, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/name/{dynamic_id}/profile",
					dynamic_id: summonerNames,
					expires: cacheTimes.LONG
				},
				path: "/api/lol/${region}/v1.4/summoner/by-name/${summonerNames}",
				pathParameters: {
					region: options.region,
					summonerNames: Array.isArray(summonerNames) ? summonerNames.join(",") : undefined
				}
			});
		},
		// Get summoner objects mapped by summoner ID for a given list of summoner IDs.
		byId: (callback, summonerIds, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/profile",
					dynamic_id: summonerIds,
					expires: cacheTimes.LONG
				},
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get mastery pages mapped by summoner ID for a given list of summoner IDs
		masteries: (callback, summonerIds, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/masteries",
					dynamic_id: summonerIds,
					expires: cacheTimes.VERY_LONG
				},
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}/masteries",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get summoner names mapped by summoner ID for a given list of summoner IDs.
		names: (callback, summonerIds, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/name",
					dynamic_id: summonerIds,
					expires: cacheTimes.LONG
				},
				path: "/api/lol/${region}/v1.4/summoner/${summonerIds}/name",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(summonerIds) ? summonerIds.join(",") : undefined
				}
			});
		},
		// Get rune pages mapped by summoner ID for a given list of summoner IDs.
		runes: (callback, summonerIds, options) => {
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "summoner/{dynamic_id}/runes",
					dynamic_id: summonerIds,
					expires: cacheTimes.SHORT
				},
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
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "teams/bySummoner/{dynamic_id}",
					dynamic_id: summonerIds,
					expires: cacheTimes.SHORT
				},
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
			request(callback, {
				region: options.region,
				cache: {
					enabled: options.cache !== undefined ? options.cache : true,
					region: options.region,
					identifier: "teams/byId/{dynamic_id}",
					dynamic_id: teamIds,
					expires: cacheTimes.LONG
				},
				path: "/api/lol/${region}/v2.4/team/${teamIds}",
				pathParameters: {
					region: options.region,
					summonerIds: Array.isArray(teamIds) ? teamIds.join(",") : undefined
				}
			});
		}
	}
};