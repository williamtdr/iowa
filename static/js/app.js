/* Redirect to /region/summonername upon enter in checkbox or submit press */
function loadSummonerPage() {
	window.location = $(".summoner-region").val().toLowerCase() + "/" + $(".summoner-name-submit").val();
	$(".summoner-name-go").html("<i class=\"fa fa-spin fa-circle-o-notch\"></i>");
}

$(".summoner-name-submit").keyup(function(ev) {
	if(event.keyCode === 13)
		loadSummonerPage();
});

$(".summoner-name-go").click(loadSummonerPage);

/* animsition initialization code */
$(document).ready(function() {
	$(".animsition").animsition({
		linkElement: ".animsition-link",
		loading: true,
		loadingParentElement: "body",
		loadingClass: "animsition-loading",
		browser: ["animation-duration", "-webkit-animation-duration"]
	}).on('animsition.inStart', function() {
		$(".animsition").show();
	});
});