String.prototype.replaceAll = function(search, replacement) {
	let target = this;
	return target.split(search).join(replacement);
};

module.exports = {
	unique(a) {
		let seen = {};
		return a.filter(item => {
			return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		});
	},
	replaceAt(text, index, character) {
		return text.substr(0, index) + character + text.substr(index + character.length);
	},
	getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	getUnixTime() {
		return Math.floor(Date.now() / 1000);
	},
	shuffleArray(a) {
		let j, x, i;

		for(i = a.length; i; i--) {
			j = Math.floor(Math.random() * i);
			x = a[i - 1];
			a[i - 1] = a[j];
			a[j] = x;
		}

		return a;
	},
	randomString(length) {
		let text = "",
			possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for(let i = 0; i < (length || 20); i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	},
	zeroPad(number, length) {
		number = number.toString();

		return number.length >= length ? number : new Array(length - number.length + 1).join("0") + number;
	},
	cheapClone(obj) {
		return JSON.parse(JSON.stringify(obj));
	},
	shallowClone(obj) {
		return Object.assign({}, obj);
	},
	isAlphanumeric(str) {
		return str.match(/^[a-z0-9]+$/i);
	},
	sort(data, key) {
		data.sort((a, b) => {
			a = (a === "" ? a : get(a, key));
			b = (b === "" ? b : get(b, key));

			// Decimals cause inaccurate sort, assume two
			if(a * 100 > b * (1e16))
				return -1;

			if(a * 100 < b * (1e16))
				return 1;

			return 0;
		});

		return data;
	}
};