function sketch() {
  let fr = 60;
  let SPEED = 1;
  let peaksPerScreen = 3;
  let peaksPerScreenBuffer = 2;
  let bins = 256;

  let sound, fft, cnv, waveManager, player, wavy, circleWave, particles, satellites = {}, audioProperties, uiControls, drawQueue;
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
          length: width/2,
          x1: width*.25,
          x2: width*.75,
          y: height - 30
      }
      , ph = { // playhead
          width: 12,
          height: 12,
          x: track.x1,
          y: track.y,
          xIncr: track.length / duration,
          updateX: function() {
            // only update once every 250 ms
            // can be taken out to improve smoothness, is an effort at killing overhead
            if (frameCount % (fr/4) !== 0) {
              return;
            }
            this.x = track.x1 + this.xIncr * sound.currentTime();
          }
      };

    this.draw = function() {
      ph.updateX();

      strokeWeight(2);
      stroke(0);
      line(track.x1, track.y, track.x2, track.y);
      noStroke();
      fill(255);
      ellipse(ph.x, ph.y, ph.width, ph.height);
    }
  };

  let WaveformManager = function(sound, peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)

    let self = this;
    let waveWidth = Math.floor(sound.duration() * width);
    let peakDistance = width / peaksPerScreen;
    let frameDistance = width / fr;
    let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
    let peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here

    let positionX = 0;
    let offsetX = 0;
    let maxOffsetY = 30;
    let vertices;

    this.onOrientationChange = function() {
      waveWidth = Math.floor(sound.duration() * width);
      peakDistance = width / peaksPerScreen;
      frameDistance = width / fr;
    };

    let updateOffsetX = function() {
      offsetX = Math.round( positionX % peakDistance );
      // offsetX = Math.round( (offsetX + frameDistance) % peakDistance );
      // console.log(offsetX);
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

      let rawVs = [];
      vertices = [];

      // get the raw vertices
      for (let i=0; i < peaksPerScreen+peaksPerScreenBuffer; i++) {

        let j = i + Math.floor(positionX/peakDistance);
        let x = Math.floor(i * peakDistance);
        let y = Math.round( map(peaks[j], -1, 1, height/8, height-(height/8)) );

        rawVs.push({x, y});
      };
      // create the audio reactive and offset bounds
      let yOffset = map(audioProperties.energy.bass, 0, 255, 0, maxOffsetY) + height/4;
      // let yOffset = height/4; // no audio offset

      // upper bounds
      for (let v of rawVs) {
        vertices.push(createVector(v.x-offsetX, v.y-yOffset));
      }
      // lower bounds
      for (let v of rawVs.reverse()) {
        vertices.push(createVector(v.x-offsetX, yOffset+v.y));
      }

      self.vertices = vertices;
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

      beginShape();
      fill(themes.active.bg);
      stroke(themes.active.bg);
      strokeWeight(1);

      for (let v of vertices) {
        vertex(v.x, v.y);
      }
      endShape();
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }
  };

  let Satellite = function(planet, frequency = "bass", diameter = 40, maxOrbitDistance = 120, fftValues = audioProperties) {

    // fuck you internal critic, I'll be a baillerina
    let degree = 360/fr/(frequency === "bass" ? 2 : 1);
    let radian = Math.radians(degree); // the increment around the circle in radians
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
          x = Math.sin(radian*i) * hypotenuse;
          y = Math.cos(radian*i) * hypotenuse;
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
    let maxDiameter = 75;
    let hasThrust = false;

    $(document).on("thrust", function() {
      hasThrust = true;
    });
    $(document).on("gravity", function() {
      hasThrust = false;
    });

    this.draw = function() {

      if (y<height && y>0) {
        y = mouseIsPressed ? y-2 : y+4;
      }
      else if (y==height && mouseIsPressed) {
        y -= 2;
      }
      else if (y==0 && !mouseIsPressed) {
        y += 4;
      }
      else if (y>height) {
        y = height;
      }
      else if (y<0) {
        y = 0;
      }

      let diameter = map(audioProperties.energy.bass, 0, 255, 0, maxDiameter);

      noStroke();
      fill(255);
      ellipse(x, y, diameter, diameter);

      self.x = x;
      self.y = y;
      self.diameter = diameter;
    }
  };



  let Wavy = function() {
    let draw = function() {
      let waveform = fft.waveform();
      noFill();
      beginShape();
      stroke(255,255,255); // waveform is red
      strokeWeight(1);

      // console.log(`waveform: ${waveform.length}`);

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
    let radian = Math.radians(degree); // the increment around the circle in radians
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
              x = Math.sin(radian*i) * hypotenuse;
              y = Math.cos(radian*i) * hypotenuse;
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


var hit = false;
var poly = [];

/*
  -----------------------
  Processing Loop - start
  -----------------------
*/

  this.preload = function() {
    sound = loadSound(url); // put in the soundcloud retrieved URL
  };

  this.setup = function() {

    collideDebug(true);

    frameRate(fr);
    cnv = createCanvas(windowWidth, windowHeight);

    // cnv.mouseClicked(togglePlay);

    fft = new p5.FFT(0.8, bins); // 0.8 is default smoothing value
    sound.amp(0.2);
    center.x = width / 2;
    center.y = height / 2;

    audioProperties = new AudioProperties();

    uiControls = new UIControls();
    waveManager = new WaveformManager(sound, peaksPerScreen, SPEED);
    player = new PlayerManager();

    drawQueue = [ // ordering matters will decide the z-index
      waveManager, player, uiControls
    ];

    // particles = new VectorParticles(circleWave);
    // satellites.bass = new Satellite(circleWave, "bass");
    // satellites.mid = new Satellite(circleWave, "treble");
    // satellites.treble = new Satellite(satellites.bass, "treble");

    background(0);
    togglePlay();

  };

  this.draw = function() {
    if (sound.isPlaying()) {
      background(themes.active.wall);
      audioProperties.update();

      drawQueue.forEach(ob => { ob.draw(); });
    }

    // ellipse(mouseX,mouseY,45,45);
    // hit = collideCirclePoly(mouseX,mouseY,45,waveManager.vertices);

    hit = collideCirclePoly(player.x, player.y, player.diameter, waveManager.vertices);
    //enable the hit detection if the circle is wholly inside the polygon

    print("colliding? " + hit);

  };

  this.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
    center.x = width / 2;
    center.y = height / 2;
  };

  this.keyPressed = function(ev) {
    if (keyCode === ESCAPE) {
      togglePlay();
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


  /* Hacking, need to fire a window load event to have P5 run the sketch code */
  debugger;
  this.dispatchEvent(new Event('load')); // this is window
};