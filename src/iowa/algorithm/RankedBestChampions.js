/*
 * Order champions by approximate player skill
 *
 * Factors:
 *  - Player kill + assist/death ratio: 40%
 *  - Match outcome (win/loss): 30%
 *  - Damage dealt/taken ratio: 10%
 *  - Number of matches played as champion: 10%
 *  - Average amount of gold: 5%
 *  - Average minions killed: 5%
 */

const util = require("../../util/util");

function addFactor(result, data, factor) {
	for(let champion_key in data) {
		let champion = data[champion_key];

		result[champion.id] += ((data.length - champion_key) * factor);
	}
}

module.exports = (input) => {
	let result = {};

	for(let champion of input)
		result[champion.id] = 0;

	addFactor(result, util.sort(input, "kills.ratio"), 0.4);
	addFactor(result, util.sort(input, "outcome.ratio"), 0.3);
	addFactor(result, util.sort(input, "damage.ratio"), 0.1);
	addFactor(result, util.sort(input, "outcome.played"), 0.1);
	addFactor(result, util.sort(input, "creepScore.average"), 0.05);
	addFactor(result, util.sort(input, "gold.average"), 0.05);

	result = Object.keys(result).sort((a, b) => {
		return result[b] - result[a]
	});

	return result;
};