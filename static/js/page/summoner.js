/*
 * Loaded directly on summoner profile pages.
 */

function loadSummonerInfo(region, id) {
	$.get("/data/" + region + "/" + id, function(data) {
		$("#sub-content").html(data);
	})
}