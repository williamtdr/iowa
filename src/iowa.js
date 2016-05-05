/*
 * Main application logic
 */

var http = require("./http"),
	api = require("./api/api"),
	cache = require("./api/cache").engine;

cache.loadTable();

console.log("Ready :)");