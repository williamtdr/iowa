const colors = require("colors"),
	  util = require("./util");

function format(source, message, prefixColor, color) {
	const d = new Date();

	console.log((util.zeroPad(d.getHours(), 2) + ":" + util.zeroPad(d.getMinutes(), 2) + ":" + util.zeroPad(d.getSeconds(), 2) + " ").magenta + "[".grey + source[prefixColor || "white"] + "]".grey + " "[color || "white"] + message);
}

const logger = {
	info(message) {
		format(this.source, message, this.prefixColor);
	},
	debug(message) {
		format(this.source, message.gray, this.prefixColor);
	},
	warn(message) {
		format(this.source, message.yellow, this.prefixColor);
	},
	error(message) {
		format(this.source, message.red, this.prefixColor);
	}
};


module.exports = (source, prefixColor) => {
	return {
		info: logger.info,
		debug: logger.debug,
		warn: logger.warn,
		error: logger.error,
		source,
		prefixColor
	};
};