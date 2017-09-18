/*
 * Store for common static info to be referenced by the other classes.
 * Populated by iowa.js.
 */

module.exports = {
	data: {},
	championNameToId: (name) => {
		for(let id in module.exports.data.champion)
			if(module.exports.data.champion[id].name === name)
				return id;

		return false;
	}
};