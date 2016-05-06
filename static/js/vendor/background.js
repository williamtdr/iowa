/*
 * background.js - Pick a random fullscreen background image under a vignette, switching with transitions
 * TODO: Load image asynchronously and integrate with animsition
 * Attempt 1: Fail to emulate the behavior of background-size: cover with an <img> element at all screen sizes
 */

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

var last_image_placed = 2,
	first_background = true;

$("body").append('<div id="background_layer"><div class="top"></div><div class="bottom"></div></div><div id="background_shader"></div>');

advanceBackgroundImage = function() {
	var target_el;

	var options = {
		root: "/img/bg",
		ext: ".jpg",
		min: 1,
		max: 1
	};

	var new_background = options.root + "/" + getRandomInt(options.min, options.max) + options.ext;

	if(last_image_placed == 2) {
		target_el = $(".top");
		last_image_placed = 1;
	} else {
		target_el = $(".bottom");
		last_image_placed = 2;
	}

	target_el.attr('style', 'background: url("' + new_background + '") no-repeat center center fixed; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;');

	if(first_background) {
		$(document).ready(function () {
			$("#background_layer").animate({
				opacity: 1
			}, 300);
		});
		first_background = false;
	} else
		$(".top").toggleClass("transparent");
};

advanceBackgroundImage();