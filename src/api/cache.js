/*
 * Caches API responses to memory and the filesystem (default .cache/).
 * Different endpoints are cached differently based on whether they have
 * custom parameters. A table is maintained of cached information, and what
 * information was passed to request it.
 */

/*
 * This code may hurt you. Do not stare at it directly.
 */

var fs = require("fs-extra"),
	utils = require("../utils");

var memory_cache = {},
	table = {}; // cache/info.json

// Used by api.js and others to configure cache length
module.exports.times = {
	VERY_SHORT: global.user_config.get("cache.times.very_short"),
	SHORT: global.user_config.get("cache.times.short"),
	MEDIUM: global.user_config.get("cache.times.medium"),
	LONG: global.user_config.get("cache.times.long"),
	VERY_LONG: global.user_config.get("cache.times.very_long")
};

var engine = {
	loadTable: () => {
		console.log("Loading cache information table...");
		try {
			table = fs.readJSONSync(global.user_config.get("cache.directory") + "/info.json");
			console.log("Running initial cache cleanup...");
			engine.checkOutdatedEntries(true);
		} catch(e) {
			console.log("Cache not found or corrupt, initializing...");
			try {
				fs.emptyDirSync(global.user_config.get("cache.directory"));
			} catch(e) {
				fs.mkdirsSync(global.user_config.get("cache.directory"));
			}
			engine.saveTable();
		}

	},
	saveTable: () => {
		fs.outputJSON(global.user_config.get("cache.directory") + "/info.json", table);
	},
	// Iterates through the table to find cached data for endpoints that
	// accept custom parameters or multiple values for a single field.
	complexLookup: (info) => {
		for(var key in table) {
			var entry = table[key];
			if(entry.identifier === info.identifier && JSON.stringify(entry.params) === JSON.stringify(info.params))
				return key;
		}

		return false;
	},
	// Periodically called to remove information that is no longer current
	// from the JSON files and the table. Cache expiration can be configured
	// in config.json/cache/times.
	checkOutdatedEntries: (sync) => {
		var entries_removed = 0;

		for(var key in table)
			if(table[key].expires <= Math.floor(Date.now() / 1000)) {
				entries_removed++;
				console.log("removing " + key + "...");

				if(sync)
					fs.removeSync(key + ".json");
				else fs.remove(key + ".json");

				if(memory_cache[key])
					delete memory_cache[key];

				delete table[key];
			}

		if(entries_removed > 0)
			console.log("Cache cleaned up, removed " + entries_removed + " entries.");
	},
	fromFile: (path, info, onMiss, callback) => {
		fs.readJSON(global.user_config.get("cache.directory") + "/" + path + ".json", "utf8", (err, data) => {
			if(err) {
				// Object exists in the table, but not on disk
				console.warn(path + ".json exists in the table, but not on the disk!");
				onMiss((data) => {
					engine.save(info, data);
					callback(data);
				});
			} else {
				memory_cache[path] = data;
				callback(data);
			}
		});
	},
	saveFile: (id, data) => {
		fs.outputJSON(global.user_config.get("cache.directory") + "/" + id + ".json", data, (err) => {
			if(err)
				console.warn("Encountered a problem when trying to save the cache for an API request: " + err);
		});
	},
	// Called by api.js to get data. Returns cached data if available,
	// or forwards the request then stores the result.
	hitOr: (callback, info, onMiss) => {
		var base = (info.region || "global"),
			key = base + "/" + info.identifier;

		if(info.dynamic_id)
			if((info.dynamic_id.length === 1 && info.dynamic_id[0]))
				key = base + "/" + info.identifier.replace("{dynamic_id}", info.dynamic_id[0]);

		if(info.identifier && !info.params && (!info.dynamic_id || (info.dynamic_id.length === 1 && info.dynamic_id[0])))
			if(table[key] === undefined || table[key].expires <= Math.floor(Date.now() / 1000)) {
				// Object has a simple key, but is not yet in the cache or has expired
				onMiss((data) => {
					engine.save(info, data);
					callback(data);
				});
			} else {
				if(memory_cache[key])
					return callback(memory_cache[key]);

				engine.fromFile(key, info, onMiss, callback);
			}
		else {
			// iterate over cache to find ID
			var lookup = engine.complexLookup(info);

			if(lookup)
				engine.fromFile(lookup, info, onMiss, callback);
			else
				onMiss((data) => {
					engine.save(info, data);
					callback(data);
				});
		}
	},
	// Saves an API response to disk and the table
	save: (info, data) => {
		var id;

		if(data.type === "error" && !global.user_config.get("cache.save_failures"))
			return false;

		id = (info.region || "global") + "/" + info.identifier; // Case 1: Simple identifier, no dynamic or params

		if(info.params)
			while(table[id]) // avoid collisions with existing files
				id = (info.region || "global") + "/" + info.identifier + "-" + utils.randomString(8); // Case 2: Custom parameters

		// Lists with only one entry can be saved as if they took one parameter.
		// Generate a random filename for lists with multiple entries.
		if(info.dynamic_id)
			if(info.dynamic_id.length === 1 && info.dynamic_id[0]) {
				info.identifier = info.identifier.replace("{dynamic_id}", info.dynamic_id[0]);
				id = (info.region || "global") + "/" + info.identifier;
			} else
				while(table[id])
					id = (info.region || "global") + "/multi/" + info.identifier.replace("{dynamic_id}", utils.randomString(8)); // Case 3: Dynamic, optional params

		table[id] = {
			expires: Math.floor(Date.now() / 1000) + info.expires
		};

		if(info.params)
			delete info.params.api_key;

		table[id].identifier = info.identifier;

		if(info.dynamic_id && info.dynamic_id.length > 1)
			table[id].dynamic_id = info.dynamic_id;

		if(info.params)
			table[id].params = info.params;

		engine.saveTable();
		memory_cache[id] = data;
		engine.saveFile(id, data);
	}
};

module.exports.engine = engine;

setInterval(engine.checkOutdatedEntries, (module.exports.times.MEDIUM * 1000));