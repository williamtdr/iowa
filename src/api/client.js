/*
 * Handles making the request to the Riot API servers, with simple error handling for the response.
 * Checks rate limits as defined in the configuration. Tracks regions and their information.
 */

const Client = require("node-rest-client").Client,
	  cache = require("./cache").engine,
	  colors = require("colors"),
	  moment = require("moment"),
	  util = require("../util/util"),
	  log = require("../util/log")("RiotAPI", "magenta"),
	  RateLimiter = require("limiter").RateLimiter;

let limiters = [],
	request_queue = [],
	request_counter = -1,
	config;

const regionData = {
	"na": {
		host: "na1.api.riotgames.com",
		id: "NA1"
	},
	"eune": {
		host: "eun1.api.riotgames.com",
		id: "EUN1"
	},
	"euw": {
		host: "euw1.api.riotgames.com",
		id: "EUW1"
	},
	"oce": {
		host: "oc1.api.riotgames.com",
		id: "OC1"
	},
	"br": {
		host: "br1.api.riotgames.com",
		id: "BR1"
	},
	"jp": {
		host: "jp1.api.riotgames.com",
		id: "JP1"
	},
	"kr": {
		host: "kr.api.riotgames.com",
		id: "KR"
	},
	"lan": {
		host: "la1.api.riotgames.com",
		id: "LA1"
	},
	"las": {
		host: "la2.api.riotgames.com",
		id: "LA2"
	},
	"tr": {
		host: "tr1.api.riotgames.com",
		id: "TR1"
	},
	"ru": {
		host: "ru.api.riotgames.com",
		id: "RU"
	},
	"pbe": {
		host: "pbe1.api.riotgames.com",
		id: "PBE1"
	}
};

module.exports.regions = regionData;

const client = new Client({
	requestConfig: {
		timeout: 3000,
		noDelay: true
	},
	responseConfig: {
		timeout: 15000
	}
});

module.exports.request = (callback, info) => {
	function retrieve(callback) {
		let args = {
			path: info.pathParameters || {},
			parameters: info.queryParameters || {}
		}, key;

		for(key in args.path)
			if(args.path[key] === undefined)
				delete args.path[key];

		for(key in args.parameters)
			if(args.parameters[key] === undefined)
				delete args.parameters[key];

		args.parameters.api_key = config.get("credentials.riot_api_key");

		let req = client[info.method || "get"](info.fullPath || "https://" + regionData[info.region].host + info.path, args, (data, response) => {
			let path = function(str) {
				return eval(str.replace("${", "${this."));
			}.call(info.pathParameters, '`' + info.path + '`');

			log.info(`Request for ${path.cyan}`);

			if(response.statusCode !== 200) {
				const callbackReply = {
					type: "error",
					code: response.statusCode
				};

				switch(response.statusCode) {
					case 400:
						callbackReply.text = "Bad request.";
					break;
					case 403:
						callbackReply.text = "Authorization failure.";
						log.warn("Warning: Received an authentication error from Riot's API servers. Make sure your API key is correct.");
					break;
					case 404:
						callbackReply.text = "Resource not found.";
					break;
					case 429:
						const retry = response.headers["retry-after"] * 1000;

						log.warn(`Rate limited for resource, retrying in ${moment(new Date(Date.now() + retry)).fromNow(false)}`);
						return setTimeout(() => retrieve(callback), retry);
					break;
					case 500:
						callbackReply.text = "The API encountered an internal server error.";
					break;
				}

				callback(callbackReply);
			} else
				callback(data);
		});

		req.on("requestTimeout", (req) => {
			callback({
				type: "error",
				text: "The request timed out before it could be executed. This implies an error with the machine - check you have available sockets."
			});
			req.abort();
		});

		req.on("responseTimeout", (res) => {
			callback({
				type: "error",
				text: "The request to the API server timed out. You can check the status of pvp.net servers at http://status.leagueoflegends.com/."
			});
		});

		req.on("error", (err) => {
			callback({
				type: "error",
				text: "Internal error before the request could be made: " + err
			});
		});
	};

	function check_limiter(request_counter, engine_callback) {
		for(let limiter of limiters)
			limiter.removeTokens(1, () => {
				if(--request_queue[request_counter] === 0) {
					retrieve(engine_callback);
					delete request_queue[request_counter];
				}
			});
	}

	let add_to_limiter = (engine_callback) => {
		request_counter++;
		request_queue[request_counter] = limiters.length;

		check_limiter(request_counter, engine_callback);
	};

	if(info.cache && info.cache.enabled)
		cache.hitOr(callback, info.cache, add_to_limiter);
	else
		retrieve(callback);
};

module.exports.init = appConfig => {
	config = appConfig;
	for(let condition of config.get("rate_limiting"))
		limiters.push(new RateLimiter(condition.requests, condition.reset * 1000));
};