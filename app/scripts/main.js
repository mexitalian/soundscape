
let musicManager = function() {

  let soundfile = "../media/hayley.mp3";
  let audio = new Audio(soundfile);
  let isPlaying = false;
  let toggle = function(callback) {
    if (isPlaying) {
      audio.pause();
    }
    else {
      audio.play();
    }
    isPlaying = !isPlaying;

    if (typeof callback == "function") {
      callback.apply({isPlaying});
    }
  };
  return {toggle, isPlaying};
}();

let $playbackBtn = $(".js-play");
$playbackBtn.on("click", function() {
  let self = this;
  musicManager.toggle(function() {
    self.textContent = this.isPlaying ? "Pause" : "Play";
  });
});