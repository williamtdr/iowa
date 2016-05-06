function loadSummonerInfo(region, id) {
	$.get("/data/" + region + "/" + id, function(data) {
		$("#sub-content").html(data);
	})
}