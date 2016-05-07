/*
 *  __   ______   __     __   ______    
 * /\ \ /\  __ \ /\ \  _ \ \ /\  __ \   
 * \ \ \\ \ \/\ \\ \ \/ ".\ \\ \  __ \  
 *  \ \_\\ \_____\\ \__/".~\_\\ \_\ \_\ 
 *   \/_/ \/_____/ \/_/   \/_/ \/_/\/_/ 
 * 
 * Institute of War Aptitude
 * 
 * Web-based tool to give tips to players based on their match history
 * and profile, with an emphasis on champion mastery and related champions.
 * Built by williamtdr & Kellvas (NA) for the Riot API Challenge 2016.
 *
 * This file validates the configuration then launches the main app.
 */

var Config = require("./src/config");
global.user_config = false; // config/config.json

console.log("IoWA - Institute of War Aptitude");
console.log("---");

var next = (result) => {
	if(!result) {
		console.log("There was an error reading the IoWA configuration file (config/config.json).");
		console.log("Please make sure the file exists, has the proper permissions and valid JSON.");
		console.log("If you'd like to start over, copy config.sample.json.");
		return process.exit(1);
	}
	
	if(global.user_config.get("credentials.riot_api_key").length !== 36) {
		console.log("This project requires a developer key for the Riot Games API");
		console.log("to retrieve summoner stats and other data. Please get one from");
		console.log("developer.riotgames.com and enter it in config/config.json.");
		return process.exit(1);
	}

	// Config looks good, launch app
	var http = require("./src/http"),
		engine = require("./src/api/cache").engine;

	console.log("Ready :)");
};

console.log("Reading configuration...");
global.user_config = new Config("config/config.json", next);