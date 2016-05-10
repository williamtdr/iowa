/*
 * Main client-side JS loaded on all page requests.
 */

// Redirect to /region/summonerName upon enter in checkbox or submit press
function loadSummonerPage() {
	window.location = $(".summoner-region").val().toLowerCase() + "/" + $(".summoner-name-submit").val();
	$(".summoner-name-go").html("<i class=\"fa fa-spin fa-circle-o-notch\"></i>");
}

$(".summoner-name-submit").keyup(function(ev) {
	if(event.keyCode === 13)
		loadSummonerPage();
});

$(".summoner-name-go").click(loadSummonerPage);

// Transition initialization code
$(document).ready(function() {
	$(".animsition").animsition({
		linkElement: ".animsition-link",
		loading: true,
		loadingParentElement: "body",
		loadingClass: "animsition-loading",
		browser: ["animation-duration", "-webkit-animation-duration"]
	}).on("animsition.inStart", function() {
		$(".animsition").show(); // Prevents content showing pre-animation

		$(".twitter").attr("href", "https://twitter.com/intent/tweet?text=Check%20out%20my%20profile%20on%20the%20Institute%20of%20War%20Aptitude!%20http%3A%2F%2Fiowa.tdr.moe" + window.location.pathname);

		$(function() {
			$("footer").css({
				position: "absolute",
				bottom: 0
			}).show();
		});
	});
});