/*
 * Mapping for summoner.byName data
 */

"use strict";

const StaticData = require("./../StaticData").data;

module.exports = class SummonerProfile {
	constructor(data, region) {
		this.name = data.name;
		this.id = data.id;
		this.accountId = data.accountId;
		this.level = data.summonerLevel;
		this.imageURL = StaticData.realm.cdn + "/"+ StaticData.realm.v + "/img/profileicon/" + data.profileIconId + ".png";
		this.region = region;
	}
};