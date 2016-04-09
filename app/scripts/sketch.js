let sound, fft;
let fr = 60;
let SPEED = 1;
let peaksPerScreen = 4;

let cnv; // canvas
let wavePG; // processing graphic, n::note graphic is not the way, t::todo remove

let waveWidth;
let waveManager;

let WaveformManager = function(peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)
  // We will draw 4 peaks (8 vertices) to screen at any one moment
  // with 2 peaks (4 verticies) off screen

  // start with 4 always on screen – static
  let peakDistance = width / peaksPerScreen;
  let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
  let peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here
  // let screenCount = 0;
  let offsetX = 0;
  let vertices = [];

  let updateOffsetX = function() {
    offsetX = Math.floor( (offsetX + (width / fr)) % peakDistance );
    console.log(offsetX);
  };

  let getVertices = function() {

    vertices = [];

    for (let i=0; i<peaksPerScreen+2; i++) {

      let j = i + Math.floor(positionX/peakDistance);

      vertices.push([
        Math.floor(i * peakDistance),//Math.round((peakDistance/2) + (i * peakDistance)),
        Math.round( map(peaks[j], -1, 1, height/8, height-(height/8)) )
      ]);
    }
    // screenCount++;
  };

  this.draw = function() {

    getVertices();
    updateOffsetX();

    background(0);
    beginShape();
    fill(255,0,0);
    stroke(255,0,0);
    strokeWeight(1);

    // upper limit
    for (let v of vertices) {
      let x = v[0] - offsetX,
          y = v[1] - height/4;
      vertex(x, y);
    }

    // lower limit
    for (let v of vertices.reverse()) {
      let x = v[0] - offsetX,
          y = height/4 + v[1];
      vertex(x, y);
    }

    endShape();
  };

  // init
  // for (let i=0; i < Math.floor(sound.duration()); i++) {
  //   sound.addCue(i, getVertices);
  // }
};

function preload() {
  sound = loadSound('../media/hayley.mp3'); // put in the soundcloud retrieved URL
}

function setup() {

  frameRate(fr);
  cnv = createCanvas($(window).width(), 400);
  cnv.mouseClicked(togglePlay);
  // fft = new p5.FFT();
  // sound.amp(0.2);
  waveWidth = Math.floor(sound.duration() * width);
  waveManager = new WaveformManager(peaksPerScreen, SPEED);

  background(0);
}

function draw() {
  if (sound.isPlaying()) {
    waveManager.draw();
    updatePositionX();
  }
}

let positionX = 0;
let updatePositionX = function() {
  if (positionX<waveWidth) {
    positionX += Math.floor(width / fr);
  }
  else {
    positionX = 0;
  }
};

// fade sound if mouse is over canvas
let togglePlay = function() {
  if (sound.isPlaying()) {
    sound.pause();
  } else {
    sound.loop();
  }
};

/*
let sketch = function() {

  return {togglePlay};
}();
*/