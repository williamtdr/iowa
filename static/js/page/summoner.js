/*
 * Loaded directly on summoner profile pages.
 */

function closeChampionTile(el) {
	var id = el.data("id").toString();

	$(".expanded-champion-stats[data-id=\"" + id + "\"]").animate({
		height: 0
	}, 500, function () {
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
	el.find(".champion-title").show();
	$(".expanded-champion-stats[data-id=\"" + id + "\"]").show().animate({
		height: "400px"
	}, 500);
	el.find(".champion-stats").animate({
		opacity: 0
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
		$("#sidebar").show();
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