/*
 * Order champions by approximate player skill
 */

var utils = require("../../utils"),
	StaticData = require("../StaticData").data;

var addFactor = (result, data, factor) => {
	for(let champion_key in data) {
		var champion = data[champion_key];

		result[champion.id] += ((data.length - champion_key) * factor);
	}
};

function formatChampionInfo(input) {
	var output = {};

	for(let key in input) {
		output[key] = {};
		output[key].info = input[key].info;
		output[key].youtube_link = input[key].youtube_link;
		output[key].spells = input[key].spells;
	}
	
	return output;
}

function evaluateBasedOnTag(tag, tag_priority, championMasteryPoints, championRankedStats) {
	var result = 0;

	switch(tag) {
		case "Melee": // Shen is special for some reason...
		case "Fighter":
			result += championRankedStats.kills.averageKills * 0.8;
			result += championRankedStats.kills.averageDeaths * -0.4;
			result += championRankedStats.kills.averageAssists * 0.2;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.6;
			result += (championRankedStats.damage.averageTaken / 3000) * -0.3;
			result += (championRankedStats.gold.average / 1000) * 0.1;
		break;
		case "Support":
			result += championRankedStats.kills.averageKills * 0.3;
			result += championRankedStats.kills.averageDeaths * -0.1;
			result += championRankedStats.kills.averageAssists * 0.6;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.3;
			result += (championRankedStats.damage.averageTaken / 3000) * -0.2;
			result += (championRankedStats.gold.average / 1000) * 0.1;
			result = result * 1.05;
		break;
		case "Tank":
			result += championRankedStats.kills.averageKills * 0.4;
			result += championRankedStats.kills.averageDeaths * -0.2;
			result += championRankedStats.kills.averageAssists * 0.3;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.4;
			result += (championRankedStats.gold.average / 1000) * 0.1;
		break;
		case "Assassin":
			result += championRankedStats.kills.averageKills;
			result += championRankedStats.kills.averageDeaths * -0.4;
			result += championRankedStats.kills.averageAssists * 0.2;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.4;
			result += (championRankedStats.damage.averageTaken / 3000) * -0.3;
			result += (championRankedStats.gold.average / 1000) * 0.1;
			result = result * 0.95;
		break;
		case "Mage":
			result += championRankedStats.kills.averageKills * 0.6;
			result += championRankedStats.kills.averageDeaths * -0.3;
			result += championRankedStats.kills.averageAssists * 0.4;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.5;
			result += (championRankedStats.damage.averageTaken / 3000) * -0.3;
			result += (championRankedStats.gold.average / 1000) * 0.1;
		break;
		case "Marksman":
			result += championRankedStats.kills.averageKills * 0.9;
			result += championRankedStats.kills.averageDeaths * -0.5;
			result += championRankedStats.kills.averageAssists * 0.4;
			result += (championRankedStats.damage.averageDealt / 3000) * 0.6;
			result += (championRankedStats.damage.averageTaken / 3000) * -0.5;
			result += (championRankedStats.gold.average / 1000) * 0.1;
			result = result * 0.95;
	}

	result = result * ((championRankedStats.outcome.rate + 1) / 2);
	result = result * (championMasteryPoints / 21600);
	if(tag_priority === 0)
		result = result * 0.6;
	else if(tag_priority === 1)
		result = result * 0.4;

	return result;
}

// Create object for champion mastery data with key of champion ID
function sortChampionMastery(championMasteryData) {
	var result = {};

	for(let champion of championMasteryData)
		result[champion.championId] = champion;

	return result;
}

module.exports = (ranked_stats, champion_mastery) => {
	var result = {};

	champion_mastery = sortChampionMastery(champion_mastery);

	var aggregateStats = {
		outcome: {
			won: 0,
			lost: 0,
			played: 0
		},
		kills: {
			kills: 0,
			deaths: 0,
			assists: 0
		},
		damage: {
			dealt: 0,
			taken: 0
		},
		gold: 0
	};

	for(let champion_id in ranked_stats) {
		var champion = ranked_stats[champion_id],
			masteryScore = champion_mastery[champion_id] ? champion_mastery[champion_id].championPoints : 0;

		result[champion.id] = 0;
		aggregateStats.outcome.won += champion.outcome.won;
		aggregateStats.outcome.lost += champion.outcome.lost;
		aggregateStats.outcome.played += champion.outcome.played;
		aggregateStats.kills.kills += champion.kills.kills;
		aggregateStats.kills.deaths += champion.kills.deaths;
		aggregateStats.kills.assists += champion.kills.assists;
		aggregateStats.damage.dealt += champion.damage.dealt;
		aggregateStats.damage.taken += champion.damage.taken;
		aggregateStats.gold += champion.gold.total;

		ranked_stats[champion_id].mastery = champion_mastery[champion_id];

		for(let tag_priority in champion.tags)
			result[champion.id] += evaluateBasedOnTag(champion.tags[tag_priority], champion.tags.length === 1 ? -1 : tag_priority, masteryScore, champion);
	}

	result = Object.keys(result).sort((a, b) => {
		return result[b] - result[a]
	});

	var result_populated = [];

	for(let key in result) {
		var val = result[key];
		result_populated.push(ranked_stats[val]);
	}

	return {
		champions: result_populated,
		aggregateStats: aggregateStats,
		championInfo: formatChampionInfo(ranked_stats),
		baseURL: StaticData.realm.cdn + "/"+ StaticData.realm.v
	};
};