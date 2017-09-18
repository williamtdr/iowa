const helpers = {
	toUpperCase: (input) => {
		return input.toUpperCase();
	},
	roundOne: (input) => {
		if(typeof input === "string")
			input = parseFloat(input);

		return input.toFixed(1).toString() === input.toString() + ".0" ? input : input.toFixed(1);
	},
	numberFormatter: (input) => {
		const si = [
			{ value: 1E18, symbol: "E" },
			{ value: 1E15, symbol: "P" },
			{ value: 1E12, symbol: "T" },
			{ value: 1E9,  symbol: "G" },
			{ value: 1E6,  symbol: "M" },
			{ value: 1E3,  symbol: "k" }
		];

		for(let i = 0; i < si.length; i++)
			if(input >= si[i].value)
				return (input / si[i].value).toFixed(1).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + si[i].symbol;

		return input.toString();
	},
	spaceToUnderscore: (input) => {
		return input.replace(" ", "_");
	},
	noSpacesLowercase: (input) => {
		return input.replace(" ", "").toLowerCase();
	},
	dateFormat: (input) => {
		return new Date(parseInt(input)).toString();
	}
};

module.exports = helpers;