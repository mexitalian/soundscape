let player = "hello", myp5; // to be populated on soundcloud connect success

let SoundcloudManager = function(tracks) {

  this.tracks = tracks;
  this.urls = tracks.map(function(track, i) {
    return `${track.stream_url}?client_id=db0249f51570a7fce24a3013e71009fd`;
  });

  // let track = tracks[ Math.floor(Math.random() * tracks.length) ];
  // let url = `${track.stream_url}?client_id=db0249f51570a7fce24a3013e71009fd`;
  // let endpoint = track.stream_url.replace(/https:\/\/api.soundcloud.com\//, "");
  // var audio = new Audio();

  // SC.get(`/tracks/${trackId}`).then(function(track) {
  //   debugger;
  // });
  // SC.get(endpoint, {allow_redirects: false});
  // SC.get(`/tracks/${track.id}`).then(function(track){
    // player.play();
  // });
  // return {tracks, trackUrls};
};
/*

let musicManager = function() {

  let soundfile = "../media/hayley.mp3";
  // let soundfile = "//api.soundcloud.com/tracks/257220512/stream";
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
  return {tracks, audio, toggle, isPlaying};
};

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
*/

let dom = function() {

  let $playbackBtn = $(".js-play");
  let $connectSoundcloud = $(".js-connect-soundcloud");

  return {$playbackBtn, $connectSoundcloud};
}();

// dom.$playbackBtn.on("click", togglePlay);

// TMP: hard coded will get these from soundcloud api
// and from the on the fly getting and creation of the graphic assets
/*
let audioDuration = 261093;
let waveformWidth = "82000px";

dom.$playbackBtn.on("click", function() {

  let self = this;

  player.toggle(function() {
    self.textContent = this.isPlaying ? "Pause" : "Play";
  });

  // if (this.isPlaying) {}

  dom.$waveContainer.velocity({
    translateX: `-${waveformWidth}`//`transformX(-${waveformManager.width}px)`
  }, {
    duration: audioDuration
  });
});
*/
dom.$connectSoundcloud.on("click", function() {

  SC.connect().then(function(){
    return SC.get('/playlists/213732954');
  }).then(function(pl) {

    // console.log(pl.tracks);

    player = new SoundcloudManager(pl.tracks);
    myp5 = new p5(sketch);
  });
});

/*
dom.$waveContainer.css({
  width: `${waveformManager.width*50}px`,
  backgroundImage: `url(${waveformManager.src})`
});
*/


// Desktop
/*
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
*/

// Need a mobile on tap binding

