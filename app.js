/*
 *  __   ______   __     __   ______    
 * /\ \ /\  __ \ /\ \  _ \ \ /\  __ \   
 * \ \ \\ \ \/\ \\ \ \/ ".\ \\ \  __ \  
 *  \ \_\\ \_____\\ \__/".~\_\\ \_\ \_\ 
 *   \/_/ \/_____/ \/_/   \/_/ \/_/\/_/ 
 * 
 * Institute of War Aptitude
 * 
 * Web-based tool to give insight to players based on their ranked match statistics
 * and champion mastery data, with tools to learn about the champion and their
 * performance with it.
 * Built by williamtdr & Kellvas (NA) for the Riot API Challenge 2016.
 *
 * This file validates the configuration then launches the main app.
 */

const log = require("./src/util/log")("System", "cyan"),
	  HTTP = require("./src/interface/http"),
	  colors = require("colors"),
	  cache = require("./src/api/cache").engine,
	  core = require("./src/iowa/iowa"),
	  client = require("./src/api/client"),
	  Config = require("./src/util/config");

const iowa = {
	async init() {
		log.info("IoWA".yellow + " - Institute of War Aptitude".white);
		log.info("Reading configuration...");
		this.config = new Config("config/config.json");

		if(this.config.get("credentials.riot_api_key").length === 0) {
			log.warn("This project requires a developer key for the Riot Games API " +
				"to retrieve summoner stats and other data. Please get one from " +
				"developer.riotgames.com and enter it in config/config.json.");

			return process.exit(1);
		}

		cache.init(this.config);
		client.init(this.config);
		core.init(this.config);

		log.info("Starting web server...");
		this.http = new HTTP();
		await this.http.init(this.config.get("http.bind"));

		log.info("Ready!");
	}
};

module.exports = iowa;
iowa.init();
