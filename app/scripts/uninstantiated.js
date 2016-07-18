let Sketch = function() {

  let self = this;
  let sketchSettings = {
    peaksPerScreen: 3,
    peaksPerScreenBuffer: 2
  };
  let fr = 60;
  let SPEED = 1;
  let bins = 128;
  let sound
    , fft
    , cnv
    , tunnel
    , player
    , waveform
    , circleWave
    , particles
    , satellites = {}
    , audioProperties
    , uiControls
    , drawQ
    , startMillis
    ;
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
    },
    dynamic: {
      bg: [0],
      wall: function() {
        let v = sound.getVolume();
        if (player.mode === 'recovering' || player.mode === 'limbo') {
          return [
            floor(audioProperties.energy.bass * v),
            floor(audioProperties.energy.mid * v),
            floor(audioProperties.energy.treble * v),
          ];
        }
        else {
          return [
            audioProperties.energy.bass,
            audioProperties.energy.mid,
            audioProperties.energy.treble
          ];
        }
      }
    }
  };
  themes.active = themes.dynamic;

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

  let UIControls = function(peaksAreMirrored = false) {
    // sound is contructed before this instance is created

    let self = this;
        self.peakHeightMultiplier = +20;

    let paddingX = 100
      , duration = sound.duration()
      , track = {
          length: width, //width-paddingX*2,
          lengthToPeakRatio: Math.ceil(tunnel.peaks.length/this.length),
          x: 0, //paddingX,
          y: peaksAreMirrored ? 0 + self.peakHeightMultiplier : 0
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
        let multiplier = x < ph.x && x > ph.x-9 ? 10+(x-ph.x)
          : x < ph.x ? 1 : 0.05;
        let y1 = track.y + tunnel.peaks[i] * (multiplier*self.peakHeightMultiplier);
        // let y2 = track.y + tunnel.peaks[i] * -self.peakHeightMultiplier;

        stroke( x < ph.x ? 255 : 0 );
        strokeWeight(1);
        line(x, track.y, x, y1);

        if (peaksAreMirrored)
          line(x, y2, x, track.y);
      }

    }
  };

  let TunnelManager = function(sound, settings) { // t::todo convert to a class (fun, nth)

    let self = this;
    let s = settings;
    let waveWidth = Math.round(sound.duration() * width);
    let peakDistance = Math.round(width/settings.peaksPerScreen);
    let frameDistance = Math.round(width/fr);
    let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
    self.peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here

    let positionX = 0;
    let offsetX = 0;
    let offsetY;

    self.tunnelLimits = new function() {
      let self = this;
      let offset = height*.10
      self.offset = offset;
      self.multiplier = 0.30;
      self.update = function() {
        // these are the extremes used to map the peak values to
        self.lower = round(height * self.multiplier);
        self.upper = round(height * (1 - self.multiplier));
      };
      self.reset = function() {
        self.offset = offset;
      }
      self.getGrowth = function() {
        return self.offset - offset;
      }
      self.update();
    }();

    self.maxOffsetY = 30;
    self.reactsToBass = true;
    self.bassReactionIsLocal = false;
    let vertices;

    let updateValues = function() {
      waveWidth = Math.round(sound.duration() * width);
      peakDistance = Math.round(width/settings.peaksPerScreen);
      frameDistance = Math.round(width/fr);
    };

    settings.updateValues = function() {
      updateValues();
    };

    this.onOrientationChange = function() { // not begin used so far
      waveWidth = Math.round(sound.duration() * width);
      peakDistance = width / settings.peaksPerScreen;
      frameDistance = width / fr;
    };

    let updateVertices = function() {

      if (frameCount%(fr) === 0 && player.mode != 'limbo')
        self.tunnelLimits.offset++;

      let rawVs = [];
      vertices = [];
      offsetY = (!self.reactsToBass)
        ? self.tunnelLimits.offset
        : self.tunnelLimits.offset + round(map(audioProperties.energy.bass, 0, 255, 0, self.maxOffsetY));

      // get the raw vertices
      for (let i=0; i < settings.peaksPerScreen+settings.peaksPerScreenBuffer; i++) {

        let j = i + ceil(positionX/peakDistance); // must be ceil
        let x = i * peakDistance;
        let y = map(self.peaks[j], -1, 1, self.tunnelLimits.lower, self.tunnelLimits.upper);

        rawVs.push({x, y});
      };

      // if (self.bassReactionIsLocal)
      // {
      //   // upper bounds
      //   for (let v of rawVs) {
      //     let isAroundCenter = v.x >= center.x - peakDistance && v.x <= center.x + peakDistance;
      //     vertices.push(
      //       createVector(
      //         round(v.x-offsetX),
      //         round(isAroundCenter ? v.y-yOffsetBass : v.y-offsetY)
      //       )
      //     );
      //   }
      //   // lower bounds
      //   for (let v of rawVs.reverse()) {
      //     let isAroundCenter = v.x >= center.x - peakDistance && v.x <= center.x + peakDistance;
      //     vertices.push(
      //       createVector(
      //         round(v.x-offsetX),
      //         round(isAroundCenter ? yOffsetBass+v.y : v.y+offsetY)
      //       )
      //     );
      //   }
      // }
      // else
      // {
        // upper bounds
        for (let v of rawVs) {
          vertices.push(
            createVector(round(v.x-offsetX), v.y-offsetY)
          );
        }
        // lower bounds
        for (let v of rawVs.reverse()) {
          vertices.push(
            createVector(round(v.x-offsetX), v.y+offsetY)
          );
        }
      // }

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
      stroke(255 - sound.getVolume() * 255);
      strokeWeight(1);

      for (let v of vertices) {
        vertex(v.x, v.y);
      }
      endShape();
    };

    this.getVertices = function(xPosition = 'center') {
      switch(xPosition) {
        case 'center':
          if (!vertices) // when no sound has been analised but another object wants the vertices
            return false;

          return vertices.filter(v => {
            // get the two vertices either side of the horizontal center
            return v.x >= center.x - peakDistance && v.x <= center.x + peakDistance;
          });
      }
    };

    this.getY = function(position) {

      let cv = this.getVertices();

      if (!cv)
        return 0;

      let adj = cv[1].x - cv[0].x; // same as peakDistance but rounded
      let oppOnRight = cv[0].y > cv[1].y;
      let opp = oppOnRight ? cv[0].y - cv[1].y : cv[1].y - cv[0].y;
      let rad = atan(opp/adj);
      let adjToCenter = oppOnRight ? center.x - cv[0].x : cv[1].x - center.x;
      let oppAtCenter = adjToCenter * tan(rad);
      let y = oppOnRight ? cv[0].y - oppAtCenter : cv[1].y - oppAtCenter; // topmost point of the linedraw between vertices

      switch (position)
      {
        case 'top':
          return y;

        case 'bottom':
          return y + offsetY*2; // the distance between top and bottom

        case 'center':
          return y + offsetY; // by the half distance between top and bottom
      }
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }
  };

  let Satellite = function(planet, options) {

    let self = this;
    let defaults = {
      freq: 'bass'//,
      // maxDiameter: planet.radius,
      // maxOrbit: planet.radius * 3
    };
    let s = $.extend({}, defaults, options); // settings
    // fuck you internal critic, I'll be a baillerina
    let degree = 360/fr/(s.freq === "bass" ? 2 : 1);
    let radian = radians(degree); // the increment around the circle in radians
    let x = this.x;
    let y = this.y;
    let diameter;
    let audio = audioProperties;

    let updateDiameter = function() {
      diameter = map(audio.energy[s.freq], 0, 255, 0, planet.radius);
      self.radius = diameter/2;
    };

    let updateCoords = function() {
      //  give me back the progression around the circle every frame
      let i = frameCount % (fr*(s.freq === "bass" ? 2 : 1));
      let hypotenuse = planet.radius + map(audio.energy[s.freq], 0, 255, 0, planet.radius*6); // able to drop into the planet
      // let hypotenuse = planet.radius + map(audio.energy[s.freq], 0, 255, diameter, s.maxOrbit); // giving min planets diameter

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
      noStroke(0);
      fill(themes.active.wall());
      ellipse(x, y, diameter, diameter);
    };
  };

  let PlayerManager = function() {

    let self = this;
    let x = center.x;
    let y = center.y; // begin at center
    let diameter;
    self.minDiameter = 10;
    self.maxDiameter = self.minDiameter + self.minDiameter*3;
    let hasThrust = false;
    let gravity = 6;
    let thrust = 4;
    let resetOnFrame;

    self.mode = "play";

    let updateVars = function() {

      let updateY = function() {

        if (y<height && y>0) {
          y = mouseIsPressed || keyIsDown(32) ? y-2 : y+4;
        }
        else if (y==height &&
                (mouseIsPressed || keyIsDown(32))) {
          y -= thrust;
        }
        else if (y==0 &&
                (!mouseIsPressed || !keyIsDown(32))) {
          y += gravity;
        }
        else if (y>height) {
          y = height;
        }
        else if (y<0) {
          y = 0;
        }
      };

      switch(self.mode) {

        case 'play':
          updateY();
          break;

        case 'reset':
          y = tunnel.getY('center');
          self.minDiameter = 1;
          self.maxDiameter = self.minDiameter + self.minDiameter*3;
          self.mode = 'limbo';
          $(document).trigger({type: 'volume:change', level: 0.1});
          break;

        case 'limbo':
          y = tunnel.getY('center');
          $(document).one('thrust', function() {
            resetOnFrame = frameCount;
            self.mode = 'recovering';
          });
          break;

        case 'recovering':

          let minDiameter = floor((frameCount-resetOnFrame)/18); // 18 makes it 3 seconds

          if (minDiameter > self.minDiameter) {
            self.minDiameter = minDiameter;
            self.maxDiameter = self.minDiameter + self.minDiameter*3;

            $(document).trigger({
              type: 'volume:change',
              level: ((frameCount-resetOnFrame)/18)/10
            });

            if (self.minDiameter === 10) {
              self.mode = 'play';
            }
          }

          updateY();
          break;

        default: break;
      }

      diameter = map(audioProperties.energy.bass, 0, 255, self.minDiameter, self.maxDiameter);
      self.x = x;
      self.y = y;
      self.diameter = diameter;
      self.radius = diameter/2;
    };

    this.draw = function() {
      updateVars();
      noStroke();
      fill(255);
      ellipse(x, y, diameter, diameter);
    };

  };



  let Wavy = function(orientation = 'tunnel') {

    let minX, maxX, minY, maxY, offsetBaseUnit, prevWaves = []
      , self = this
      , audio = audioProperties;

    this.waveWeight = 1;

    switch(orientation) {
      case "vertical":
        minX = width*.25;
        maxX = width*.75;
        break;

      case "tunnel":
        minX = 0;
        maxX = width*.1;
        offsetBaseUnit = width;
        break;

      case 'horizontal':
      case 'outer':
        minX = 0;
        maxX = width;
        offsetBaseUnit = height;
        break;
    }


    this.draw = function() {

      switch(orientation) {
        case 'tunnel':
        case 'outer':
          minY = tunnel.getY('top');
          maxY = tunnel.getY('bottom');
          break;
      }

      let wave = [], frameDiv = 3;

      beginShape();
      noFill();
      stroke(255); // waveform is white

      for (let i = 0; i< audio.waveform.length; i++)
      {
        let x, y;
        switch (orientation) {
          case 'tunnel':
            x = (width/2 + maxX/2) - map(audio.waveform[i], -1, 1, minX, maxX);
            y = map(i, 0, audio.waveform.length, minY, maxY); // there will be surplus detail here that cannot be drawn, only take the available pixels to peaks
            break;

          case 'vertical':
            x = map(audio.waveform[i], -1, 1, minX, maxX);
            y = map(i, 0, audio.waveform.length, 0, height);
            break;

          case 'horizontal':
            x = map(i, 0, audio.waveform.length, minX, maxX);
            y = map(audio.waveform[i], -1, 1, 0, height);
            break;

          case 'outer':
            x = map(i, 0, audio.waveform.length, minX, maxX);
            y = map(audio.waveform[i], -1, 1, minY, maxY);
            break;
        }

        vertex(x,y);
        wave.push({x,y});
      }
      endShape();

      if (frameCount%frameDiv === 0)
        prevWaves.unshift(wave);

      if (prevWaves.length > player.minDiameter-1) {
        prevWaves.pop();
      }

      if (prevWaves.length > 0) {

        noFill();
        strokeWeight(self.waveWeight);

        for (let j=0; j<prevWaves.length; j++)
        {
          let offset = (j+1) * round(offsetBaseUnit / (fr/frameDiv) );
          beginShape();
          stroke( orientation === 'outer' ? [255, offset] : 255-offset); // waveform is progressive shades away from white

          for (let k=0; k<prevWaves[j].length; k++)
          {
            switch(orientation) {
              case 'tunnel':
              case 'vertical':
                vertex(prevWaves[j][k].x-offset, prevWaves[j][k].y);
                break;

              case 'horizontal':
                vertex(prevWaves[j][k].x, prevWaves[j][k].y-minY-offset);
                break;

              case 'outer':
                vertex(
                  prevWaves[j][k].x,
                  prevWaves[j][k].y - minY - offset
                );
                break;
            }

          }
          endShape();

          if (orientation === 'outer') {
            beginShape();
            stroke( orientation === 'outer' ? [255, offset] : 255-offset);
            for (let l=0; l<prevWaves[j].length; l++) {
              vertex(
                prevWaves[j][l].x,
                prevWaves[j][l].y + minY + offset
              );
            }
            endShape();
          }
          // decide how many waveforms to display depending on the tunnel growth
          if (tunnel.tunnelLimits.getGrowth()/5 < j+1)
            return;
        }
      }
    };

    // return { draw, waveWeight };
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
    // collideDebug(true);
    frameRate(fr);
    cnv = createCanvas(600, 400); //windowWidth, windowHeight
/*
    cnv.mousePressed(function() {
      if (!sound.isPlaying())
        player.mode = 'reset';
    });
*/
    fft = new p5.FFT(0.8, bins); // 0.8 is default smoothing value
    sound.amp(1, 1);
    center.x = width / 2;
    center.y = height / 2;

    audioProperties = new AudioProperties();

    tunnel = new TunnelManager(sound, sketchSettings);
    waveform = new Wavy('outer');
    player = new PlayerManager();
    uiControls = new UIControls();
    satellites.first = new Satellite(player, {freq: 'treble'});

    drawQ = [ // ordering matters will decide the stacking
      waveform, tunnel, player, uiControls, satellites.first
    ];

    // particles = new VectorParticles(circleWave);
    // satellites.bass = new Satellite(circleWave, "bass");
    // satellites.mid = new Satellite(circleWave, "treble");
    // satellites.treble = new Satellite(satellites.bass, "treble");

    $(document).on('volume:change', function(ev) {
      console.log(ev.level);
      sound.setVolume(ev.level);
    });

    background(0);
    togglePlay();

    self.sound = sound;
    self.audioProperties = audioProperties;
    self.uiControls = uiControls;
    self.tunnel = tunnel;
    self.player = player;

    initDatGUI();
  };

  window.draw = function() {

    if (sound.isPlaying())
      audioProperties.update();

    // background(themes.active.wall);
    background(themes.dynamic.wall());

    drawQ.forEach(ob => { ob.draw(); });
    hit = collideCirclePoly(player.x, player.y, player.diameter, tunnel.vertices);
    // print("colliding? " + hit);

    if (hit/* && player.mode !== 'pause'*/) {
      // togglePlay('pause');
      background([0,0,0]);
      player.mode = 'reset';
      tunnel.tunnelLimits.reset();
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
    if (toggle === 'pause') {
      sound.pause();
    }
    else if (sound.isPlaying()) {
      sound.pause();
      player.mode = 'pause';
    } else {
      sound.play();
      player.mode = 'play';
    }
  };


  let initDatGUI = function() {
    let gui = new dat.GUI();
    let controller = gui.add(sketchSettings, 'peaksPerScreen', 2, 10).step(1);

    controller.onFinishChange(function(value) {
      this.object.updateValues();
    });

    gui.add(waveform, 'waveWeight', 1, 100).step(1);
    // gui.add(tunnel, 'tunnelLimits', 0.1, 0.9);
    gui.add(tunnel, 'maxOffsetY', -30, 30);
    gui.add(tunnel, 'reactsToBass');
    gui.add(player, 'maxDiameter', 0, 100);
    gui.add(player, 'minDiameter', 0, 100);
    gui.add(uiControls, 'peakHeightMultiplier', -100, 100);
  };

  /* Hacking, need to fire a window load event to have P5 run the sketch code */
  window.dispatchEvent(new Event('load')); // this is window
};
