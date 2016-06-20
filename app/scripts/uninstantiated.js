let Sketch = function() {

  let self = this;
  let fr = 60;
  let SPEED = 1;
  let peaksPerScreen = 3;
  let peaksPerScreenBuffer = 2;
  let bins = 256;
  let sound
    , fft
    , cnv
    , peaks
    , player
    , wavy
    , circleWave
    , particles
    , satellites = {}
    , audioProperties
    , uiControls
    , drawQueue;
  let url = audioPlayer.urls[ Math.floor(Math.random() * audioPlayer.urls.length) ];

  let center = {};
  let themes = {
    active: undefined, // to be assigned the active theme values
    soviet: {
      bg: [0,0,0],
      wall: [255,0,0]
    },
    classic: {
      bg: [0], // blick
      wall: [102,255,102] // green
    }
  };
  themes.active = themes.classic;

  /*
    Get the FFT spectrum, energies, waveform into a central location
    ----------------------------------------------------------------
  */
  let AudioProperties = function() {

    this.energy;
    this.waveform;
    this.update = function() {

        fft.analyze();
        this.energy = {
          bass: fft.getEnergy("bass"),
          mid: fft.getEnergy("mid"),
          treble: fft.getEnergy("treble")
        };
        this.waveform = fft.waveform();
    };

    this.update();
  };

  let UIControls = function() {
    // sound is contructed before this instance is created
    let duration = sound.duration()
      , track = {
          length: width-200,
          lengthToPeakRatio: Math.ceil(peaks.peaks.length/this.length),
          x: 100,
          y: height - 30
      }
      , ph = { // playhead
          x: track.x,
          xIncr: track.length / duration,
          updateX: function() {
            // only update once every 250 ms
            // can be taken out to improve smoothness, is an effort at killing overhead
            // if (frameCount % (fr/4) !== 0) {
            //   return;
            // }
            this.x = track.x + this.xIncr * sound.currentTime();
          }
      };

    this.draw = function() {

      ph.updateX();

      for (let i=0; i<track.length; i++) {

        let x = track.x+i;
        let y1 = track.y+peaks.peaks[i]*10;
        let y2 = track.y+peaks.peaks[i]*-10;

        stroke( x < ph.x ? 255 : 0 );
        strokeWeight(1);
        line(x, track.y, x, y1);
        line(x, y2, x, track.y);
      }

    }
  };

  let TunnelManager = function(sound, peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)

    let self = this;
    let waveWidth = Math.round(sound.duration() * width);
    let peakDistance = Math.round(width/peaksPerScreen);
    let frameDistance = Math.round(width/fr);
    let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
    self.peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here

    let positionX = 0;
    let offsetX = 0;
    self.yMapUpperLimit = height/1.5;
    self.maxOffsetY = -30;
    let vertices;

    this.onOrientationChange = function() { // not begin used so far
      waveWidth = Math.round(sound.duration() * width);
      peakDistance = width / peaksPerScreen;
      frameDistance = width / fr;
    };

    let updateVertices = function() {

      let rawVs = [];
      vertices = [];

      // get the raw vertices
      for (let i=0; i < peaksPerScreen+peaksPerScreenBuffer; i++) {

        let j = i + ceil(positionX/peakDistance); // must be ceil
        let x = i * peakDistance;
        let y = map(self.peaks[j], -1, 1, 0, self.yMapUpperLimit);

        rawVs.push({x, y});
      };
      // create the audio reactive and offset bounds
      let yOffset = map(audioProperties.energy.bass, 0, 255, self.maxOffsetY, 0) + height/4;
      // let yOffset = height/4; // no audio offset

      // upper bounds
      for (let v of rawVs) {
        vertices.push(
          createVector(round(v.x-offsetX), round(v.y-yOffset))
        );
      }
      // lower bounds
      for (let v of rawVs.reverse()) {
        vertices.push(
          createVector(round(v.x-offsetX), round(yOffset+v.y))
        );
      }

      self.vertices = vertices;
      // t::todo put this line in
      // return the vertices from this function to wherever it is called
      // return vertices;
    };

    let updateOffsetX = function() {
      offsetX = ceil(positionX % peakDistance);
      // offsetX = Math.round( (offsetX + frameDistance) % peakDistance );
      // console.log(offsetX);
    };

    let updatePositionX = function() {
      if (positionX < waveWidth) {
        // move one full screen per framerate
        positionX += frameDistance;
      }
      else {
        positionX = 0;
      }
    };

    let updateVars = function() {
      updateVertices();
      updateOffsetX();
      updatePositionX();
    };

    this.draw = function() {

      if (sound.isPlaying())
        updateVars();

      beginShape();
      fill(themes.active.bg);
      stroke(themes.active.bg);
      strokeWeight(1);

      for (let v of vertices) {
        vertex(v.x, v.y);
      }
      endShape();
    };

    this.getCenterY = function() {

      let cv = vertices.filter(v => {
        return v.x >= center.x - peakDistance && v.x <= center.x + peakDistance;
      });

      let adj = cv[1].x - cv[0].x; // same as peakDistance but rounded
      let oppOnRight = cv[0].y > cv[1].y;
      let opp = oppOnRight ? cv[0].y - cv[1].y : cv[1].y - cv[0].y;
      let rad = atan(opp/adj);
      let adjToCenter = oppOnRight ? center.x - cv[0].x : cv[1].x - center.x;
      let oppAtCenter = adjToCenter * tan(rad);
      let y = oppOnRight ? cv[0].y - oppAtCenter : cv[1].y - oppAtCenter;

      y += (height/4); // by the half distance between top and bottom

      return y;
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }
  };

  let Satellite = function(planet, frequency = "bass", diameter = 40, maxOrbitDistance = 120, fftValues = audioProperties) {

    // fuck you internal critic, I'll be a baillerina
    let degree = 360/fr/(frequency === "bass" ? 2 : 1);
    let radian = radians(degree); // the increment around the circle in radians
    let x = this.x;
    let y = this.y;
    let newDiameter;
    let self = this;

    this.radius;

    let updateDiameter = function() {
      newDiameter = map(fftValues.energy[frequency], 0, 255, 0, diameter);
      self.radius = newDiameter/2;
    };

    let updateCoords = function() {
      //  give me back the progression around the circle every frame
      let i = frameCount % (fr*(frequency === "bass" ? 2 : 1));
      let hypotenuse = planet.radius + map(fftValues.energy[frequency], 0, 255, diameter, maxOrbitDistance);

      switch (i*degree) {
        case 0:
        // case 360:
          x = 0;
          y = hypotenuse;
          break;

        case 90:
          x = hypotenuse;
          y = 0;
          break;

        case 180:
          x = 0;
          y = -1 * hypotenuse;
          break;

        case 270:
          x = -1 * hypotenuse;
          y = 0;
          break;

        default:
          x = sin(radian*i) * hypotenuse;
          y = cos(radian*i) * hypotenuse;
      }
      self.x = x = x + planet.x;
      self.y = y = y + planet.y;
    };

    this.draw = function() {
      updateCoords();
      updateDiameter();
      fill(255);
      ellipse(x, y, newDiameter, newDiameter);
    };
  };

  let PlayerManager = function() {

    let self = this;
    let x = center.x;
    let y = center.y; // begin at center
    let diameter;
    let minDiameter = 10;
    let maxDiameter = 50;
    let hasThrust = false;
    let gravity = 6;
    let thrust = 4;
    self.mode = "play";

    let updateVars = function() {

      switch(self.mode) {
        case "play":
          if (y<height && y>0) {
            y = mouseIsPressed ? y-2 : y+4;
          }
          else if (y==height && mouseIsPressed) {
            y -= thrust;
          }
          else if (y==0 && !mouseIsPressed) {
            y += gravity;
          }
          else if (y>height) {
            y = height;
          }
          else if (y<0) {
            y = 0;
          }

          diameter = map(audioProperties.energy.bass, 0, 255, 0, maxDiameter);
          break;

        case "reset":
          y = peaks.getCenterY();
          self.mode = "play";
          sound.play();
          break;

        default: break;
      }

      self.x = x;
      self.y = y;
      self.diameter = diameter;
    };

    this.draw = function() {
      updateVars();
      noStroke();
      fill(255);
      ellipse(x, y, diameter, diameter);
    };

  };



  let Wavy = function() {
    let draw = function() {
      let waveform = fft.waveform();
      noFill();
      beginShape();
      stroke(255,255,255); // waveform is red
      strokeWeight(1);

      for (var i = 0; i< waveform.length; i++){
        var x = map(i, 0, waveform.length, 0, width);
        var y = map( waveform[i], -1, 1, 0, height);
        vertex(x,y);
      }
      endShape();
    };

    return { draw };
  };



  let CircularWaveform = function(multiplier = 300) {

    let self = this;
    let radius = this.radius = 50; // px
    // we shall begin by doing a quarter circle
    let degree = 360/bins;
    let radian = radians(degree); // the increment around the circle in radians
    let vectors;

    let prevVectorsLength = 5; // 60 frames of old vectors = 1 second
    let prevVectorsIsFull = false;
    let prevVectors = this.prevVectors = new Array();
    let frameRange = 1;

    $(document).on("up", function() {
      if (frameRange == fr)
        return;
      frameRange++;
    });

    $(document).on("down", function() {
      if (frameRange === 1)
        return;
      frameRange--;
    });
/*
    let getPrevVectors = function() {
      return prevVectors; // necessary??? ::Todo:: Check
    };
*/
    this.draw = function() {

      let waveform = audioProperties.waveform, x, y;
      vectors = [];

      fill(255);
      beginShape();
      stroke(255,255,255); // waveform is white
      strokeWeight(1);

      for (let i=0; i<bins; i++) {

        // if (i%2!==0 && i%3!==0) {

          let hypotenuse = radius + multiplier * waveform[i];

          switch (i*degree) {
            case 0:
            // case 360:
              x = 0;
              y = hypotenuse;
              break;

            case 90:
              x = hypotenuse;
              y = 0;
              break;

            case 180:
              x = 0;
              y = -1 * hypotenuse;
              break;

            case 270:
              x = -1 * hypotenuse;
              y = 0;
              break;

            default:
              x = sin(radian*i) * hypotenuse;
              y = cos(radian*i) * hypotenuse;
          }

        x = x + center.x;
        y = (typeof centerY === "function") ? y + centerY() : y + center.y;

        vertex(x, y);

        vectors.push(createVector(x, y));
      }

      endShape();

      if (frameCount % frameRange === 0)
      {
        if (!prevVectorsIsFull) {
          prevVectorsIsFull = prevVectors.length == prevVectorsLength;
        }
        else {
          prevVectors.pop();
        }
        prevVectors.unshift(vectors);
      }

      self.x = center.x;
      self.y = center.y;

    };

  };

  let VectorParticles = function(circleWave) {

    let draw = function() {

      let opacity = 90;
      let weight = 1;

      for (let vectors of circleWave.prevVectors) {

        stroke(255, opacity);
        strokeWeight(weight);

        for (let vector of vectors) {
          point(vector.x, vector.y);
        }

        opacity = opacity - 20;
        weight = weight + 1;
      }
    };
    return {draw};
  };

// not beging used thus far
// time, begin/start value, change in value, duration
Math.easeInQuart = function (t, b, c, d) {
  t /= d;
  return c*t*t*t*t + b;

  // time is irrelevant
  // [x] start value is the y co-ordinate
  // change in value is the variable
  // duration depends upon length of keypress
};


let hit = false;

/*
  -----------------------
  Processing Loop - start
  -----------------------
*/

  window.preload = function() {
    sound = loadSound(url); // put in the soundcloud retrieved URL
  };

  window.setup = function() {

    collideDebug(true);

    frameRate(fr);
    cnv = createCanvas(600, 400); //windowWidth, windowHeight
    cnv.mousePressed(function() {
      if (!sound.isPlaying())
        player.mode = "reset";
    });

    fft = new p5.FFT(0.8, bins); // 0.8 is default smoothing value
    sound.amp(1, 1);
    center.x = width / 2;
    center.y = height / 2;

    audioProperties = new AudioProperties();

    peaks = new TunnelManager(sound, peaksPerScreen, SPEED);
    player = new PlayerManager();
    uiControls = new UIControls();

    drawQueue = [ // ordering matters will decide the z-index
      peaks, player, uiControls
    ];

    // particles = new VectorParticles(circleWave);
    // satellites.bass = new Satellite(circleWave, "bass");
    // satellites.mid = new Satellite(circleWave, "treble");
    // satellites.treble = new Satellite(satellites.bass, "treble");

    background(0);
    togglePlay();

    self.sound = sound;
    self.audioProperties = audioProperties;
    self.uiControls = uiControls;
    self.peaks = peaks;
    self.player = player;

    initDatGUI();
  };

  window.draw = function() {

    if (sound.isPlaying())
      audioProperties.update();

    background(themes.active.wall);

    drawQueue.forEach(ob => { ob.draw(); });
    hit = collideCirclePoly(player.x, player.y, player.diameter, peaks.vertices);
    // print("colliding? " + hit);

    if (hit && player.mode !== "pause") {
      togglePlay("pause");
      player.mode = "pause";
    }

  };

  window.windowResized = function() {
    resizeCanvas(600, 400); //windowWidth, windowHeight
    center.x = width / 2;
    center.y = height / 2;
  };

  window.keyPressed = function(ev) {
    switch(keyCode) {

      case ESCAPE:
        togglePlay();
        player.mode = "play";
        break;

      /*case DOWN_ARROW:
        player.mode = "reset";
        break;*/
    }
  };
/*
  -----------------------
  Processing Loop -  end
  -----------------------
*/



  // fade sound if mouse is over canvas
  let togglePlay = function(toggle) {
    if (toggle==="pause") {
      sound.pause();
    }
    else if (sound.isPlaying()) {
      sound.pause();
    } else {
      sound.play();
    }
  };


  let initDatGUI = function() {
    let gui = new dat.GUI();
    gui.add(peaks, 'yMapUpperLimit', 0, 1000);
    gui.add(peaks, 'maxOffsetY', -30, 30);
  };

  /* Hacking, need to fire a window load event to have P5 run the sketch code */
  window.dispatchEvent(new Event('load')); // this is window
};