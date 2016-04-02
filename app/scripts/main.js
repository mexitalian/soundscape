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
  return {audio, toggle, isPlaying};
}();

let waveformManager = function() {

  let src = "../images/spectrum.png";
  let image = new Image();
      image.src = src;

  return {
    src: src,
    img: image,
    width: image.width,
    height: image.height
  };
}();

let dom = function() {

  let $playbackBtn = $(".js-play");
  let $waveContainer = $(".js-wave-container");
  let $vessel = $(".js-vessel");

  return {$playbackBtn, $waveContainer, $vessel};
}();

// TMP: hard coded will get these from soundcloud api
// and from the on the fly getting and creation of the graphic assets
let audioDuration = 261093;
let waveformWidth = "82000px";

dom.$playbackBtn.on("click", function() {

  let self = this;

  musicManager.toggle(function() {
    self.textContent = this.isPlaying ? "Pause" : "Play";
  });

  // if (this.isPlaying) {}

  dom.$waveContainer.velocity({
    translateX: `-${waveformWidth}`//`transformX(-${waveformManager.width}px)`
  }, {
    duration: audioDuration
  });
});


dom.$waveContainer.css({
  width: `${waveformManager.width*50}px`,
  backgroundImage: `url(${waveformManager.src})`
});

// Desktop

let onKeypress = function(ev) {
  console.log("upwards");
  ev.preventDefault();
  dom.$vessel.velocity("stop").velocity({translateY: "-200"}, {duration: 2500});
}

$(document).one("keypress", function(ev) {
  musicManager.toggle();
  dom.$waveContainer.velocity({
    translateX: `-${waveformWidth}`//`transformX(-${waveformManager.width}px)`
  }, {
    duration: audioDuration
  });
  onKeypress(ev);
});

$(document).on("keyup", ev => {
  console.log("downwards");
  $(document).one("keypress", onKeypress);
  dom.$vessel.velocity("stop").velocity({translateY: "200"}, {duration: 2500});
});


// Need a mobile on tap binding

