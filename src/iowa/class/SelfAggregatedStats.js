/*
 * Mapping for stats.ranked's return data
 */

"use strict";

const StaticData = require("./../StaticData").data;

class SelfAggregatedStats {
	constructor(id) {
		this.id = id;
		this.matchIds = [];
		this.outcome = {
			won: 0,
			lost: 0,
			played: 0,
			rate: (0 / 1).toFixed(2),
			ratio: (0 / (0 || 1)).toFixed(2)
		};
		this.kills = {
			kills: 0,
			assists: 0,
			deaths: 0,
			averageKills: 0 / 1,
			averageAssists: 0 / 1,
			averageDeaths: 0 / 1
		};
		this.damage = {
			dealt: 0,
			taken: 0,
			magic: 0,
			physical: 0,
			averageDealt: (0 / 1).toFixed(2),
			averageTaken: (0 / 1).toFixed(2),
			ratio: (0 / (0 || 1)).toFixed(2)
		};
		this.creepScore = {
			total: 0,
			average: (0 / 1).toFixed(2)
		};
		this.gold = {
			total: 0,
			average: (0 / 0).toFixed(2)
		};
		this.accomplishments = {
			totalDoubleKills: 0,
			totalTripleKills: 0,
			totalQuadraKills: 0,
			totalPentaKills: 0,
			totalUnrealKills: 0,
			totalFirstBlood: 0
		};
		this.extremes = {
			kills: 0,
			deaths: 0,
			spells_cast: 0
		};
		this.turrets = {
			total: 0,
			average: (0 / 1).toFixed(2)
		};

		this.name = "";
		this.title = "";
		this.stats = "";
		this.info = "";
		this.spells = [];
		this.youtube_link = "";
		this.imageURL = "";
		this.splashURL = "";
		this.tags = [];

		const champion_info = StaticData.champion[this.id.toString()];
		if(typeof champion_info !== "undefined") {
			this.name = champion_info.name;
			this.title = champion_info.title;
			this.stats = champion_info.stats;
			this.info = champion_info.info;
			this.spells = champion_info.spells;
			this.youtube_link = champion_info.youtube_link;
			this.imageURL = StaticData.realm.cdn + "/"+ StaticData.realm.v + "/img/champion/" + champion_info.image.full;
			this.splashURL = StaticData.realm.cdn + "/img/champion/splash/" + champion_info.key + "_0.jpg";
			this.tags = champion_info.tags;
		}
	}
}

module.exports = SelfAggregatedStats;