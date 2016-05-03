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

module.exports.api = {
	/**
	 * The state of champions, including whether they are active, enabled for
	 * ranked play, in the free champion rotation, or available in bot games.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1077
	 */
	champion: {
		// Retrieve champion by ID.
		get_one: (id, options) => {

		},
		// Retrieve all champions.
		get_all: (free_to_play, options) => {

		}
	},
	/**
	 * Information about a summoner's champion mastery, a statistic that increments as they
	 * play more matches as a specific champion. Scores for individual champions can be
	 * requested, or the full list can be obtained.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1071
	 */
	champion_mastery: {
		// Get a champion mastery by player id and champion id. Response code 204 means there were no masteries found for given player id or player id and champion id combination.
		get_one: (summoner_id, champion_id, options) => {

		},
		// Get all champion mastery entries sorted by number of champion points descending.
		get_all: (summoner_id, options) => {

		},
		// Get a player's total champion mastery score, which is sum of individual champion mastery levels.
		score: (summoner_id, options) => {

		},
		// Get specified number of top champion mastery entries sorted by number of champion points descending.
		top_champions: (summoner_id, count, options) => {

		}
	},
	/**
	 * If the summoner is currently in a game, this endpoint returns information about the
	 * current state of that game: Other participants, bans, time and gamemode are among the
	 * returned information.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/976
	 */
	current_game: (summoner_id, options) => {

	},
	/**
	 * Lists summary information about featured games, as they are shown in the lower right
	 * of the pvp.net client's homepage.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/977
	 */
	featured_games: (options) => {

	},
	/**
	 * Gets a list of recent matches played by a given summoner ID. Detailed information
	 * includes that similar to that which is shown at the end-of-game screen.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1078
	 */
	game: (summoner_ids, options) => {

	},
	/**
	 * Ranked information by summoner, team, or list tiers for upper
	 * levels (challenger/master). Shows participants in a league.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/985
	 */
	league: {
		// Get leagues mapped by summoner ID for a given list of summoner IDs.
		by_summoner: (summoner_ids, options) => {

		},
		// Get league entries mapped by summoner ID for a given list of summoner IDs.
		by_summoner_entry: (summoner_ids, options) => {

		},
		// Get leagues mapped by team ID for a given list of team IDs.
		by_team: (team_ids, options) => {

		},
		// Get league entries mapped by team ID for a given list of team IDs.
		by_team_entry: (team_ids, options) => {

		},
		// Get challenger tier leagues
		challenger: (type, options) => {

		},
		// Get master tier leagues.
		master: (type, options) => {

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
		champion_all: (locale, version, data_by_id, champ_data, options) => {

		},
		// Retrieves a champion by its id.
		champion_one: (id, locale, version, champ_data, options) => {

		},
		// Retrieves item list.
		item_all: (locale, version, item_list_data, options) => {

		},
		// Retrieves item by its unique id
		item_one: (id, locale, version, item_data, options) => {

		},
		// Retrieve language strings data
		language_strings: (locale, version, options) => {

		},
		// Retrieve supported languages data.
		languages: (options) => {

		},
		// Retrieve map data.
		map: (locale, version, options) => {

		},
		// Retrieves mastery list.
		mastery: (locale, version, mastery_list_data, options) => {

		},
		// Retrieve realm data.
		realm: (options) => {

		},
		// Retrieves rune list.
		rune: (locale, version, rune_list_data, options) => {

		},
		// Retrieves rune by its unique id.
		rune_by_id: (id, locale, version, rune_data, options) => {

		},
		// Retrieves summoner spell list.
		summoner_spell: (locale, version, data_by_id, spell_data, options) => {

		},
		// Retrieves summoner spell by its unique id.
		summoner_spell_by_id: (id, locale, version, spell_data, options) => {

		},
		// Retrieve version data.
		versions: (options) => {

		}
	},
	/**
	 * Gets server status by region. Not rate limited.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/908
	 */
	status: {
		// Get shard list.
		get_all_shards: (options) => {

		},
		// Get shard status. Returns the data available on the status.leagueoflegends.com website for the given region.
		get_one_shard: (options) => {

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
		by_tournament: (tournament_code, options) => {

		},
		// Retrieve match by match ID and tournament code.
		for_tournament: (match_id, tournament_code, include_timeline, options) => {

		},
		// Retrieve match by match ID.
		match: (match_id, include_timeline, options) => {

		}
	},
	/**
	 * Get a list of matches for a given summoner ID. Includes timestamps,
	 * IDs, season, region, role, etc.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1069
	 */
	match_list: (summoner_id, champion_ids, ranked_queues, seasons, begin_time, end_time, begin_index, end_index, options) => {

	},
	/**
	 * Ranked or unranked match history for a given summoner ID.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1080
	 */
	stats: {
		// Get ranked stats by summoner ID.
		ranked: (summoner_id, season, version, options) => {

		},
		// Get player stats summaries by summoner ID.
		summary: (summoner_id, season, options) => {

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
		by_name: (summoner_names, options) => {

		},
		// Get summoner objects mapped by summoner ID for a given list of summoner IDs.
		by_id: (summoner_ids, options) => {

		},
		// Get mastery pages mapped by summoner ID for a given list of summoner IDs
		masteries: (summoner_ids, options) => {

		},
		// Get summoner names mapped by summoner ID for a given list of summoner IDs.
		names: (summoner_ids, options) => {

		},
		// Get rune pages mapped by summoner ID for a given list of summoner IDs.
		runes: (summoner_ids, options) => {

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
		by_summoner: (summoner_ids, options) => {

		},
		// Get teams mapped by team ID for a given list of team IDs.
		by_id: (team_ids, options) => {

		}
	},
	/**
	 * Allows for the external management of organized tournaments.
	 *
	 * Docs URL: https://developer.riotgames.com/api/methods#!/1057
	 */
	tournament_provider: {
		// Create a tournament code for the given tournament.
		create_code: (tournament_id, count, data, options) => {

		},
		// Returns the tournament code DTO associated with a tournament code string.
		get_by_code: (tournament_code, options) => {

		},
		// Update the pick type, map, spectator type, or allowed summoners for a code
		update: (tournament_code, data, options) => {

		},
		// Gets a list of lobby events by tournament code.
		list_by_code: (tournament_code, options) => {

		},
		// Creates a tournament provider and returns its ID.
		create_provider: (data, options) => {

		},
		// Creates a tournament and returns its ID.
		create_tournament: (data, options) => {

		}
	}
};