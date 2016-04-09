let sound, fft;
let SPEED = 1;

let cnv; // canvas
let wavePG; // processing graphic, n::note graphic is not the way, t::todo remove

let waveWidth;
let waveXPos;
let waveManager;

let WaveformManager = function(peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)
  // We will draw 4 peaks (8 vertices) to screen at any one moment
  // with 2 peaks (4 verticies) off screen

  // start with 4 always on screen – static
  let peakDistance = width / peaksPerScreen;
  let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
  let peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here
  let screenCount = 0;

  let getVertices = function() {

    let vertices = [];

    for (let i=0; i<peaksPerScreen; i++) {

      let j = i + (screenCount * peaksPerScreen);
      console.log((peakDistance/2) + (i * peakDistance));
      vertices.push([
        Math.round((peakDistance/2) + (i * peakDistance)),
        Math.round( map(peaks[j], -1, 1, height/8, height-(height/8)) )
      ]);
    }
    screenCount++;

    return vertices;
  };
  let drawVertices = function() {

    let vertices = getVertices();
    console.log(vertices);
    background(0);
    beginShape();
    fill(255,0,0);
    stroke(255,0,0);
    strokeWeight(1);

    // upper limit
    for (let v of vertices) {
      vertex(v[0], v[1] - height/4);
    }

    // lower limit
    for (let v of vertices.reverse()) {
      vertex(v[0], height/4 + v[1]);
    }

    endShape();
  };

  // init
  for (let i=0; i < Math.floor(sound.duration()); i++) {
    sound.addCue(i, drawVertices);
  }
};

function preload() {
  sound = loadSound('../media/hayley.mp3'); // put in the soundcloud retrieved URL
}

function setup() {

  cnv = createCanvas($(window).width(), 400);
  cnv.mouseClicked(togglePlay);
  // fft = new p5.FFT();
  // sound.amp(0.2);
/*
  let waveVertices = [];
  for (let i in WAVEFORM) {
    waveVertices.push([
      Math.round(i * stepWidth),
      Math.round(map(WAVEFORM[i], -1, 1, 0, height/2))
    ]);
  }
*/
  waveManager = new WaveformManager(4, SPEED);

  background(0);
}


function draw() {
  if (sound.isPlaying()) {

  }
}

// fade sound if mouse is over canvas
let togglePlay = function() {
  if (sound.isPlaying()) {
    sound.pause();
  } else {
    sound.loop();
  }
}

/*
let sketch = function() {

  return {togglePlay};
}();
*/





