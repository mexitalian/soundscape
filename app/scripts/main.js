
let musicManager = function() {

  let soundfile = "../media/hayley.mp3";
  let audio = new Audio(soundfile);
  let isPlaying = false;
  let toggle = function() {
    if (isPlaying) {
      audio.pause();
    }
    else {
      audio.play();
    }
    isPlaying = !isPlaying;
    return isPlaying ? "Pause" : "Play";;
  };
  return {toggle};
}();

let $playbackBtn = $(".js-play");
$playbackBtn.on("click", function(ev) {
  let newActionText = musicManager.toggle();
  this.textContent = newActionText;
});