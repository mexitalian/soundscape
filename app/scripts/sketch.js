let sound, fft;
let WAVEFORM, DURATION; // should be CONST but babel is throwing an error
let SPEED = 40000; // in milliseconds of audio playback

let cnv; // canvas
let wavePG; // processing graphic
let waveWidth;
let waveXPos;

function preload() {
  // put in the soundcloud retrieved URL
  sound = loadSound('../media/hayley.mp3');
}

function setup() {

  WAVEFORM = sound.getPeaks();
  DURATION = sound.duration() * 1000;

  cnv = createCanvas($(window).width(), 400);
  cnv.mouseClicked(togglePlay);

  waveWidth = width * Math.floor(DURATION / SPEED);
  let stepWidth = waveWidth / WAVEFORM.length;
  // fft = new p5.FFT();
  // sound.amp(0.2);

  background(0);

  waveXPos = width;//width/2;
  let waveVertices = [];
  for (let i in WAVEFORM) {
    waveVertices.push([
      Math.round(i * stepWidth),
      Math.round(map(WAVEFORM[i], -1, 1, 0, height/2))
    ]);
  }

  wavePG = createGraphics(waveWidth, height);
  wavePG.beginShape();
  wavePG.fill(255,0,0);
  wavePG.stroke(255,0,0);
  wavePG.strokeWeight(1);

  for (let v of waveVertices) {
    console.log(v[0]);
    wavePG.vertex(v[0], v[1] - height/8);
  }
  for (let v of waveVertices.reverse()) {
    wavePG.vertex(v[0], height/8 + v[1]);
  }

  wavePG.endShape();

}


function draw() {
  if (sound.isPlaying()) {
    background(0);
    image(wavePG, waveXPos, 0, waveWidth*10, height);
    waveXPos -= 2.5;
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





