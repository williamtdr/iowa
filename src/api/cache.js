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

var memory_cache = {};

module.exports.times = {
	VERY_SHORT: global.user_config.get("cache.times.very_short"),
	SHORT: global.user_config.get("cache.times.short"),
	MEDIUM: global.user_config.get("cache.times.medium"),
	LONG: global.user_config.get("cache.times.long"),
	VERY_LONG: global.user_config.get("cache.times.very_long")
};

var table = {};

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
	complexLookup: (info) => {
		for(var key in table) {
			var entry = table[key];
			if(entry.identifier === info.identifier && entry.params === info.params)
				return key;
		}

		return false;
	},
	checkOutdatedEntries: (sync) => {
		var entries_removed = 0;

		for(var key in table)
			if(table[key].expires >= Math.floor(Date.now() / 1000)) {
				entries_removed++;
				console.log("removing " + key + "...");

				if(sync)
					fs.removeSync(key);
				else fs.remove(key);

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
	hitOr: (callback, info, onMiss) => {
		var base = (info.region || "global"),
			key = base + "/" + info.identifier;

		if(info.dynamic_id)
			if((info.dynamic_id.length === 1 && info.dynamic_id[0]))
				key = base + "/" + info.identifier.replace("{dynamic_id}", info.dynamic_id[0]);

		if(info.identifier && !info.params && (!info.dynamic_id || (info.dynamic_id.length === 1 && info.dynamic_id[0])))
			if(table[key] === undefined || table[key].expires >= Math.floor(Date.now() / 1000)) {
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
	save: (info, data) => {
		var id;

		if(data.type === "error" && !global.user_config.get("cache.save_failures"))
			return false;

		if(!info.params && (!info.dynamic_id || (info.dynamic_id.length === 1 && info.dynamic_id[0]))) {
			id = (info.region || "global") + "/" + (info.dynamic_id ? info.identifier.replace("{dynamic_id}", info.dynamic_id[0]) : info.identifier);

			table[id] = {
				expires: Math.floor(Date.now() / 1000)
			};
		} else {
			if(info.dynamic_id) {
				id = (info.region || "global") + "/multi/" + info.identifier.replace("{dynamic_id}", utils.randomHash());
				// todo: collision checking

				table[id] = {
					expires: Math.floor(Date.now() / 1000),
					dynamic_id: info.dynamic_id
				};

				if(info.params)
					table[id].params = info.params;
			} else {
				id = (info.region || "global") + "/" + info.identifier + "-" + utils.randomHash(8);

				table[id] = {
					expires: Math.floor(Date.now() / 1000),
					identifier: info.identifier,
					params: info.params
				};
			}
		}

		engine.saveTable();
		memory_cache[id] = data;
		engine.saveFile(id, data);
	}
};

module.exports.engine = engine;

setInterval(engine.checkOutdatedEntries, module.exports.times.MEDIUM);