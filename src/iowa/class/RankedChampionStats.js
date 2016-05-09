/*
 * Mapping for stats.ranked's return data
 */

"use strict";

var StaticData = require("./../StaticData").data;

module.exports = class RankedChampionStats {
	constructor(data) {
		this.id = data.id;
		this.outcome = {
			won: data.stats.totalSessionsWon,
			lost: data.stats.totalSessionsLost,
			played: data.stats.totalSessionsPlayed,
			rate: (data.stats.totalSessionsWon / data.stats.totalSessionsPlayed).toFixed(2),
			ratio: (data.stats.totalSessionsWon / (data.stats.totalSessionsLost || 1)).toFixed(2)
		};
		this.kills = {
			kills: data.stats.totalChampionKills,
			assists: data.stats.totalAssists,
			deaths: data.stats.totalDeathsPerSession,
			averageKills: data.stats.totalChampionKills / this.outcome.played,
			averageAssists: data.stats.totalAssists / this.outcome.played,
			averageDeaths: data.stats.totalDeathsPerSession / this.outcome.played
		};
		this.damage = {
			dealt: data.stats.totalDamageDealt,
			taken: data.stats.totalDamageTaken,
			magic: data.stats.totalPhysicalDamageDealt,
			averageDealt: (data.stats.totalDamageDealt / this.outcome.played).toFixed(2),
			averageTaken: (data.stats.totalDamageTaken / this.outcome.played).toFixed(2),
			physical: data.stats.totalMagicDamageDealt,
			ratio: (data.stats.totalDamageDealt / (data.stats.totalDamageTaken || 1)).toFixed(2)
		};
		this.creepScore = {
			total: data.stats.totalMinionKills,
			average: (data.stats.totalMinionKills / this.outcome.played).toFixed(2)
		};
		this.gold = {
			total: data.stats.totalGoldEarned,
			average: (data.stats.totalGoldEarned / this.outcome.played).toFixed(2)
		};
		this.accomplishments = {
			totalDoubleKills: data.stats.totalDoubleKills,
			totalTripleKills: data.stats.totalTripleKills,
			totalQuadraKills: data.stats.totalQuadraKills,
			totalPentaKills: data.stats.totalPentaKills,
			totalUnrealKills: data.stats.totalUnrealKills,
			totalFirstBlood: data.stats.totalFirstBlood
		};
		this.extremes = {
			kills: data.stats.maxChampionsKilled,
			deaths: data.stats.maxNumDeaths,
			spells_cast: data.stats.mostSpellsCast
		};
		this.turrets = {
			total: data.stats.totalTurretsKilled,
			average: (data.stats.totalTurretsKilled / this.outcome.played).toFixed(2)
		};

		var champion_info = StaticData.champion[this.id.toString()];
		this.name = champion_info.name;
		this.title = champion_info.title;
		this.stats = champion_info.stats;
		this.info = champion_info.info;
		this.imageURL = StaticData.realm.cdn + "/"+ StaticData.realm.v + "/img/champion/" + champion_info.image.full;
		this.splashURL = StaticData.realm.cdn + "/img/champion/splash/" + champion_info.key + "_0.jpg";
		this.tags = champion_info.tags;
	}
};