/*
 * Loaded directly on summoner profile pages.
 */

var existing_spinners = {};

function closeChampionTile(el) {
	var id = el.data("id").toString();

	el.find(".champion-info").animate({opacity:0}, 250, function() {
		el.find(".champion-info").hide();

		$(".expanded-champion-stats[data-id=\"" + id + "\"]").animate({
			height: 0
		}, 500, function() {
			$(this).hide();
			el.find(".champion-stats").animate({
				opacity: 1
			}, 250);

			el.data("champion-tile-open", false);
			el.css({
				width: "",
				height: "",
				"-webkit-filter": "",
				"margin-bottom": "10px"
			});
			el.find(".champion-stats").hide();
			el.find(".champion-footer").css({
				height: ""
			});
			el.find(".champion-footer img").removeAttr("style");
			el.find(".champion-footer .champion-name").css({
				left: "",
				bottom: "",
				"font-size": ""
			});
			el.find(".champion-title").hide();
		});
	});
}

function openChampionTile(el) {
	var id = el.data("id").toString();

	el.data("champion-tile-open", true);
	el.css({
		width: "100%",
		height: "300px",
		"-webkit-filter": "brightness(100%)",
		"margin-bottom": 0
	});
	el.find(".champion-footer").css({
		height: "72px"
	});
	var info_area = $(".expanded-champion-stats[data-id=\"" + id + "\"]"),
		indicators = el.find(".champion-info");

	indicators.show();
	info_area.show().animate({
		height: "400px"
	}, 500);
	el.find(".champion-stats").animate({
		opacity: 0
	}, 125, function() {
		el.find(".champion-title").show();
		el.find(".champion-footer img").css({
			width: "96px",
			position: "absolute",
			bottom: "5px",
			left: "5px"
		});
		el.find(".champion-footer .champion-name").css({
			left: "106px",
			"font-size": "2em",
			"bottom": "30px"
		});

		if(existing_spinners[id])
			return;

		existing_spinners[id] = true;
		showCircle(indicators.find(".indicator-1"), id, 1, championInfo[parseInt(id)].info.attack / 10);
		showCircle(indicators.find(".indicator-2"), id, 2, championInfo[parseInt(id)].info.defense / 10);
		showCircle(indicators.find(".indicator-3"), id, 3, championInfo[parseInt(id)].info.difficulty / 10);
		showCircle(indicators.find(".indicator-4"), id, 4, championInfo[parseInt(id)].info.magic / 10);
	});
	el.find(".champion-info").show().animate({
		opacity: 1
	}, 250);
}

function onChampionTileClick(ev) {
	var el = $(this);
	if(el.data("champion-tile-open")) {
		closeChampionTile(el);
		return false;
	}

	openChampionTile(el);
}

function loadSummonerInfo(region, id) {
	$.get("/data/" + region + "/" + id, function(data) {
		$("#sub-content").html(data);
		$(".champion").unbind().click(onChampionTileClick);
		$("#ranked-won").html(aggregateStats.outcome.won);
		$("#ranked-lost").html(aggregateStats.outcome.lost);
		$("#ranked-total").html(aggregateStats.outcome.played);
		$("#ranked-kills").html(aggregateStats.kills.kills);
		$("#ranked-assists").html(aggregateStats.kills.assists);
		$("#ranked-deaths").html(aggregateStats.kills.deaths);
		$("#ranked-damage-dealt").html(nFormatter(aggregateStats.damage.dealt));
		$("#ranked-damage-taken").html(nFormatter(aggregateStats.damage.taken));
		$("#ranked-gold").html(nFormatter(aggregateStats.gold));
	});
}

function nFormatter(num) {
	var si = [
		{ value: 1E18, symbol: "E" },
		{ value: 1E15, symbol: "P" },
		{ value: 1E12, symbol: "T" },
		{ value: 1E9,  symbol: "G" },
		{ value: 1E6,  symbol: "M" },
		{ value: 1E3,  symbol: "k" }
	], i;
	for (i = 0; i < si.length; i++) {
		if (num >= si[i].value) {
			return (num / si[i].value).toFixed(1).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + si[i].symbol;
		}
	}
	return num.toString();
}

function showCircle(el, id, number, value) {
	el = el[0];

	var original_text = $(el).html();

	$(el).html("");
	$(el).animate({
		opacity: 1
	}, 125);

	var bar = new ProgressBar.Circle(el, {
		color: $(el).css("color"),
		strokeWidth: 4,
		trailWidth: 4,
		size: 35,
		easing: "easeInOut",
		duration: 1400,
		text: {
			autoStyleContainer: false
		},
		from: {color: $(el).css("color"), width: 6},
		to: {color: $(el).css("color"), width: 6},
		step: function(state, circle) {
			circle.path.setAttribute("stroke", state.color);
			circle.path.setAttribute("stroke-width", state.width);

			circle.setText(original_text);
		}
	});

	bar.animate(value);
}