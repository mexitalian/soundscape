/*
    SoundScape aims to be a music to gameplay abstraction.
    Copyright (C) 2016  Giovanni Carlo Marasco

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict"

let audioPlayer, soundscape; // to be populated on soundcloud connect success

/*
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}
*/

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

let LocalAudioManager = function() {
  return {
    name: "Bach – Air",
    url: "media/bach_usafb_air.mp3" // Public domain https://musopen.org/music/466/johann-sebastian-bach/air-on-the-g-string-from-orchestral-suite-no-3-bwv-1068/
  }
  // for when there is more than one track
  // this.urls = ['hayley', 'yuna', 'alt-j', 'london', 'coma'].map(track => {
  //   return `media/${track}.mp3`;
  // });
}

let FSAudioManager = function(tracks) {
  this.url = tracks[0];
  this.urls = tracks;
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

let handleFileSelect = function(ev) {

  let files = ev.target.files; // FileList object
  let audioUrls = [];
  let reader = new FileReader();
  let output = [];
  let audio = new Audio();

  console.log('// files is a FileList of File objects. List some properties.');

  for (let i = 0, f; f = files[i]; i++) { // look at using .filter()

    // Only process audio files.
    if (!f.type.match('audio.*')) {
      continue;
    }

    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') <br>- ',
      f.size, ' bytes, last modified: ',
      f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
      '</li>');

    audioUrls.push(f);

  }
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';

  if (audioUrls.length > 0) {
    audioPlayer = new FSAudioManager(audioUrls);
    initSoundscape();
  }
};

let initSoundscape = function() {
  window.soundscape = new SoundScape({
    audioColorMode: "HSB"
  });
};

document.querySelector('.js-files').addEventListener('change', handleFileSelect, false);
document.querySelector('.js-use-local').addEventListener('click', function(ev) {
  audioPlayer = new LocalAudioManager();
  initSoundscape();
});

let dom = function() {

  let $playbackBtn = $('.js-play');
  let $connectSoundcloud = $('.js-connect-soundcloud');

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


/*
dom.$connectSoundcloud.on("click", function() {

  SC.connect().then(function(){
    return SC.get('/playlists/213732954');
  }).then(function(pl) {

    // console.log(pl.tracks);

    audioPlayer = new SoundcloudManager(pl.tracks);
    initSoundscape();
  });
});

*/

// Desktop
(function() {

  $(document).one('soundscape:ready', function() {
    $('#canvas-capture').remove();
  });

})();
