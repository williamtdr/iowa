/*
 * Interface between the web server -> API calls and our algorithms.
 * Also gets and updates static info commonly needed by the app.
 */

const api = require("./../api/api"),
	  regions = require("./../api/client").regions,
	  cache = require("./../api/cache"),
	  cacheEngine = cache.engine,
	  urlencode = require('urlencode'),
	  StaticData = require("./StaticData"),
	  Config = require("../util/config"),
	  log = require("../util/log")("IoWA", "green"),
	  SelfAggregatedStats = require("./class/SelfAggregatedStats"),
	  SummonerProfile = require("./class/SummonerProfile"),
	  RankedWithMastery = require("./algorithm/RankedWithMastery");

let ChampionSpotlights,
	config;

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
	}, { region: config.get("default_region") });
	api.static_data.championAll((data) => {
		StaticData.data.champion = data.data;
		for(let champion_name in ChampionSpotlights.data) {
			let cId = StaticData.championNameToId(champion_name);
			if(cId)
				StaticData.data.champion[cId].youtube_link = ChampionSpotlights.data[champion_name];
		}
	}, undefined, undefined, true, ["info", "stats", "image", "tags", "spells"], { region: config.get("default_region") });
}

module.exports = {
	renderSummonerPage(callback, region, name) {
		let check = preflight(region, name);

		if(check)
			return callback(check);

		api.summoner.byName((data) => {
			if(data.type === "error")
				return callback(data);

			callback(new SummonerProfile(data, region));
		}, [urlencode(name)], { region });
	},
	renderDataPage: (callback, region, id) => {
		let response = {},
			check = preflight(region, false, id),
			ranked_stats = {},
			responded = false,
			champion_mastery,
			completedMatches = [],
			expectingMatches = 0;

		if(check)
			return callback(check);

		function checkSufficentData() {
			if(!champion_mastery || JSON.stringify(ranked_stats) === "{}")
				return;

			if(completedMatches.length !== expectingMatches)
				return;

			response = RankedWithMastery(ranked_stats, champion_mastery);

			if(!responded)
				callback(response);
		}

		const PAGES = 5;
		for(let i = 0; i < PAGES; i++)
			api.matchlist.ranked((data) => {
				if(data.type === "error" && data.code === 404) {
					response.error = { text: "No ranked matches found for this player." };

					responded = true;
					return callback(response);
				}

				for(let match of data.matches) {
					if(match === null || match.champion === 0)
						continue;

					let s = new SelfAggregatedStats(match.champion);
					s.matchIds.push(match.gameId);
					ranked_stats[match.champion] = s;
				}

				expectingMatches += Object.values(ranked_stats).reduce((sum, v) => sum + v.matchIds.length, 0);
				if(i === PAGES)
					log.info(`Aggregating stats from ${Object.values(ranked_stats).length} champions on ${expectingMatches} matches.`);

				// Start fetching match data. This is run in-parallel, and new data is evaluated
				// in the rolling computations as it comes in.
				for(let cId in ranked_stats) {
					let c = ranked_stats[cId];

					for(let m of c.matchIds) {
						log.info(`Fetching match: ${m}`);

						api.match(data => {
							completedMatches.push(m);

							function associateWithPlayer(pId) {
								for(let p of data.participantIdentities)
									if(p.participantId == pId)
										return p.player;

								return false;
							}

							if(data.error || !data.gameId)
								log.warn(`Failed to get data for match with ID ${m}.`);
							else
								for(let p of data.participants) {
									const stats = p.stats,
										championId = p.championId,
										pId = p.participantId,
										player = associateWithPlayer(pId);

									if(player && player.accountId === parseInt(id)) {
										ranked_stats[championId].outcome[stats.win ? "won" : "lost"]++;
										ranked_stats[championId].outcome.played++;
										ranked_stats[championId].outcome.ratio = (ranked_stats[championId].outcome.won / (ranked_stats[championId].outcome.lost || 1)).toFixed(2);
										ranked_stats[championId].kills.kills += stats.kills;
										ranked_stats[championId].kills.deaths += stats.deaths;
										ranked_stats[championId].kills.assists += stats.assists;
										ranked_stats[championId].kills.averageKills = parseFloat((ranked_stats[championId].kills.kills / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].kills.averageAssists = parseFloat((ranked_stats[championId].kills.assists / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].kills.averageDeaths = parseFloat((ranked_stats[championId].kills.deaths / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].damage.taken += stats.totalDamageTaken;
										ranked_stats[championId].damage.magic += stats.magicDamageDealt;
										ranked_stats[championId].damage.dealt += stats.totalDamageDealt;
										ranked_stats[championId].damage.physical += stats.physicalDamageDealt;
										ranked_stats[championId].damage.averageTaken = parseFloat((ranked_stats[championId].damage.taken / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].damage.averageDealt = parseFloat((ranked_stats[championId].damage.dealt / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].damage.ratio = parseFloat((ranked_stats[championId].damage.dealt / (ranked_stats[championId].damage.taken || 1)).toFixed(2));
										ranked_stats[championId].creepScore.total += stats.totalMinionsKilled;
										ranked_stats[championId].creepScore.average = (stats.totalMinionsKilled / ranked_stats[championId].outcome.played).toFixed(2);
										ranked_stats[championId].gold.total += stats.goldEarned;
										ranked_stats[championId].gold.average = parseFloat((ranked_stats[championId].gold.total / ranked_stats[championId].outcome.played).toFixed(2));
										ranked_stats[championId].accomplishments.totalDoubleKills += stats.doubleKills;
										ranked_stats[championId].accomplishments.totalTripleKills += stats.tripleKills;
										ranked_stats[championId].accomplishments.totalQuadraKills += stats.quadraKills;
										ranked_stats[championId].accomplishments.totalPentaKills += stats.pentaKills;
										ranked_stats[championId].accomplishments.totalUnrealKills += stats.unrealKills;
										ranked_stats[championId].accomplishments.totalFirstBlood += stats.firstBloodKill | 0;
									}
								}

							checkSufficentData();
						}, m, { region });
					}
				}
			}, id, i * 100, [400, 410, 420, 430, 440, 830, 840, 850], { region });


		api.championMastery.getAll((data) => {
			champion_mastery = data;
			console.log(data);
			checkSufficentData();
		}, id, { region });
	},
	init(appConfig) {
		config = appConfig;

		cacheEngine.loadTable();
		ChampionSpotlights = new Config("data/champion_spotlights.json");
		refreshCoreInformation();
		cacheEngine.addInitEventHandler(times => {
			setInterval(refreshCoreInformation, (times.VERY_LONG * 1000));
		})
	}
};