/*
 * Loaded directly on summoner profile pages.
 */

function closeChampionTile(el) {
	el.data("champion-tile-open", false);
	el.css({
		width: "",
		height: "",
		"-webkit-filter": ""
	});
	el.find(".champion-footer").css({
		height: ""
	});
	el.find(".champion-footer img").css({
		width: ""
	});
	el.find(".champion-footer .champion-name").css({
		left: "",
		"font-size": ""
	});
}

function openChampionTile(el) {
	el.data("champion-tile-open", true);
	el.css({
		width: "100%",
		height: "400px",
		"-webkit-filter": "brightness(100%)"
	});
	el.find(".champion-footer").css({
		height: "96px"
	});
	el.find(".champion-footer img").css({
		width: "96px"
	});
	el.find(".champion-footer .champion-name").css({
		left: "101px",
		"font-size": "2em"
	});
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
	});
}