var sketch = function(p) {

  let sound, fft;
  let fr = 60;
  let SPEED = 1;
  let peaksPerScreen = 4;
  let peaksPerScreenBuffer = 2;

  let cnv; // canvas
  let waveManager;
  let url = player.urls[ Math.floor(Math.random() * player.urls.length) ];

  let WaveformManager = function(sound, peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)

    let waveWidth = Math.floor(sound.duration() * p.width);
    // We will draw 4 peaks (8 vertices) to screen at any one moment
    // with 2 peaks (4 verticies) off screen
    // start with 4 always on screen – static
    let peakDistance = p.width / peaksPerScreen;
    let frameDistance = p.width / fr;
    let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
    let peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here
    // let screenCount = 0;
    let positionX = 0;
    let offsetX = 0;
    let vertices = [];

    let updateOffsetX = function() {
      offsetX = Math.round( positionX % peakDistance );
      // offsetX = Math.round( (offsetX + frameDistance) % peakDistance );
      console.log(offsetX);
    };

    let updatePositionX = function() {
      if (positionX < waveWidth) {
        // move one full screen per framerate
        positionX += Math.floor(frameDistance);
      }
      else {
        positionX = 0;
      }
    };

    let updateVertices = function() {

      vertices = [];

      for (let i=0; i < peaksPerScreen+peaksPerScreenBuffer; i++) {

        let j = i + Math.floor(positionX/peakDistance);
        console.log(j);

        vertices.push([
          Math.floor(i * peakDistance),//Math.round((peakDistance/2) + (i * peakDistance)),
          Math.round( p.map(peaks[j], -1, 1, p.height/8, p.height-(p.height/8)) )
        ]);
      };

      // t::todo put this line in
      // return the vertices from this function to wherever it is called
      // return vertices;
    };

    let updateVars = function() {
      updateVertices();
      updateOffsetX();
      updatePositionX();
    };

    this.draw = function() {

      updateVars();

      p.background(0);
      p.beginShape();
      p.fill(255,0,0);
      p.stroke(255,0,0);
      p.strokeWeight(1);

      // upper limit
      for (let v of vertices) {
        let x = v[0] - offsetX,
            y = v[1] - p.height/4;
        p.vertex(x, y);
      }

      // lower limit
      for (let v of vertices.reverse()) {
        let x = v[0] - offsetX,
            y = p.height/4 + v[1];
        p.vertex(x, y);
      }

      p.endShape();
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }
  };



/*
  -----------------------
  Processing Loop - start
  -----------------------
*/

  p.preload = function() {
    sound = p.loadSound(url); // put in the soundcloud retrieved URL
    sound = p.loadSound('../media/hayley.mp3'); // put in the soundcloud retrieved URL
  };

  p.setup = function() {

    p.frameRate(fr);
    cnv = p.createCanvas(p.windowWidth, 400);
    cnv.mouseClicked(togglePlay);
    // fft = new p5.FFT();
    // sound.amp(0.2);
    waveManager = new WaveformManager(sound, peaksPerScreen, SPEED);

    p.background(0);
  };

  p.draw = function() {
    if (sound.isPlaying()) {
      waveManager.draw();
    }
  };

/*
  -----------------------
  Processing Loop -  end
  -----------------------
*/



  // fade sound if mouse is over canvas
  let togglePlay = function() {
    if (sound.isPlaying()) {
      sound.pause();
    } else {
      sound.loop();
    }
  };

};
