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

let Sketch = function(options = {}) {

  let self = this;
  let defaults = {
    audioColorMode: 'RGB',
    peaksPerScreen: 3,
    peaksPerScreenBuffer: 2
  };
  let sketchSettings = $.extend({}, defaults, options);
  // const SPEED = 1;
  let fr = 60
    , bins = 128
    , sound
    , cnv
    , game
    , tunnel
    , player
    , circular
    , powerUp
    , waveform
    , moons
    , audio
    , uiControls
    , drawQ
    ;
  let url = audioPlayer.url; // audioPlayer.urls[ Math.floor(Math.random() * audioPlayer.urls.length) ];
  let center = {};
  let themes = {
    active: undefined, // to be assigned the active theme values
    soviet: {
      name: 'soviet',
      bg: [0,0,0],
      wall: [255,0,0]
    },
    classic: {
      name: 'classic',
      bg: [0], // blick
      wall: [102,255,102] // green
    },
    dynamic: {
      name: 'dynamic',
      repaintBg: false,
      hue: {
        degree: 0
      },
      bg: [0],
      wall: [0], // just to begin set to black
      // hsl: {
      //   wall: [0,0,0] // just to begin set to black
      // },
      rotate: function(deg) {
        // let degree = 0;
        // return function(deg) {

        let degree = this.hue.degree;

          if (deg)
            degree = (degree+deg)%360;

          degree = degree < 360
            ? degree + .2
            : 0;

          this.hue.degree = degree;
          return floor(degree);
      //   };
      // }(),
      },
      getColor: function(type) {
        let deg = type === 'comp' ? 180 : 120; // 120 is tertiary

        return `hsb(${floor(this.hue.degree+deg)%360}, ${floor(map(audio.energy.treble, 0, 255, 0, 100))}%, ${floor(map(audio.energy.bass, 0, 255, 0, 100))}%)`;
      },
      update: function() {


        let v = sound.getVolume()
          , wall;

        if (sketchSettings.audioColorMode === "HSB")
        {
          // HSB will map to Mid, Bass, Treble
          // Hue = 0–360
          // Saturation & Brightness 0–100
          // Note: Hue used to be map(audio.energy.mid, 0, 255, 0, 360),
          wall = `hsb(${this.rotate()}, ${floor(map(audio.energy.treble, 0, 255, 0, 100))}%, ${floor(map(audio.energy.bass, 0, 255, 0, 100))}%)`;
        }
        else // default is RGB
        {
          // TODO: phase out the volume manipulation
          if (player.mode === 'recovering' || player.mode === 'limbo')
          {
            wall = [
              floor(audio.energy.bass * v),
              floor(audio.energy.mid * v),
              floor(audio.energy.treble * v),
            ];
          }
          else
          {
            wall = [
              audio.energy.bass,
              audio.energy.mid,
              audio.energy.treble
            ];
          }
        }
        this.wall = wall;
        // this.hsl.wall = [hue(wall), saturation(wall), lightness(wall)];
      }
    }
  };
  themes.active = themes.dynamic;

  /*
    Get the FFT spectrum, energies, waveform into a central location
    ----------------------------------------------------------------
  */
  let AudioController = function() {

    // var sound is set further up the scope

    let fft = new p5.FFT(0.8, bins) // 0.8 is default smoothing value
      , self = this;

    this.update = function() {

        fft.analyze();
        self.energy = {
          bass: fft.getEnergy('bass'),
          mid: fft.getEnergy('mid'),
          treble: fft.getEnergy('treble')
        };
        self.waveform = fft.waveform();
    };

    this.toggle = function(toggle) {
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

    let togglePlayback = function(mode) {
      switch(mode)
      {
        case 'play': sound.play(); break;
        case 'pause': sound.pause(); break;
      }
    };

    // Initialize
    // ----------
    // register custom event listener
    $(document).on('mode:change', function(ev, mode) {
      console.log(mode);
      togglePlayback(mode);
    });
    this.update();
  };

  let GameController = function() {
    /*
      I want to
      [ ] Control playback from here
      [ ] Tell the player what to do
      [ ] Start and stop the audio
      [x] Keep track of the score – how long a run has occured
      [ ]
    */
    let self = this;
    this.mode; // probably doesn't need to be exposed
    let level = 1
      , newLevelFreq = 3000;

    let detectCollision = function() {

      // Tunnel
      let hit = collideCirclePoly(player.x, player.y, player.diameter, tunnel.vertices);
      if (hit) { // && player.mode !== 'pause'
        audio.toggle('pause');
        background([0,0,0]);
        player.mode = 'reset';
        // self.mode = 'stopped';
        // uiControls.countIn();
        tunnel.limits.reset();
        stopwatch.reset();
        level = 1;
      }
    };

    // let's count the amount of time since the last collision
    let stopwatch = function() {
      let timestamp
        , current
        , best = 0
        , get = function() {

          if (self.mode === 'stopped') { // this should be in the drawing
            return;
          }

          if (!timestamp) {
            timestamp = millis();
          }

          current = millis() - timestamp;

          return {current, best};
      }
        , reset = function() {
          best = best > current ? best : current;
          timestamp = undefined;
      };
      return {get, reset};
    }();

    this.set = function(key, val) { // this will accept and set any key
      this[key] = val;
      $(document).trigger(`${key}:change`, [val]);
    };

    this.update = function() {
      if (sound.isPlaying())
      {
        audio.update();
        if (themes.active.update)
          themes.active.update();

        this.stopwatch = stopwatch.get();

        if (this.stopwatch.current > level * newLevelFreq) {
          level++;
          powerUp.spawn();
        }
      }
      detectCollision();
    };
  };

  let UIController = function(opts = {}) {
    // sound is contructed before this instance is created
    let self = this
      , defaults = {
        peaksAreMirrored: false,
        peakHeightMultiplier: 20,
        drawCountdown: true
      }
      , s = $.extend({}, defaults, opts)
      , drawQ = [];

    self.peakHeightMultiplier = s.peakHeightMultiplier;

    let waveform = function(){
      let paddingX = 100 // are we still going to add a padding?
        , duration = sound.duration()
        , track = {
            length: width, //width-paddingX*2,
            lengthToPeakRatio: ceil(tunnel.peaks.length/width), // TODO: figure out why, was originally referenced to self this.length do not know why the scope has made "this" undefined changed
            x: 0, //paddingX,
            y: s.peaksAreMirrored ? 0 + self.peakHeightMultiplier : 0
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
        }
        , draw = function() {
            ph.updateX();

            for (let i = 0; i < track.length; i++) {
              let x = track.x + i;
              let multiplier = x < ph.x && x > ph.x - 9 ? 10 + (x - ph.x)
                : x < ph.x ? 1 : 0.05;
              let y1 = track.y + tunnel.peaks[i] * (multiplier * self.peakHeightMultiplier);
              // let y2 = track.y + tunnel.peaks[i] * -self.peakHeightMultiplier;

              stroke( x < ph.x ? 255 : 0 );
              strokeWeight(1);
              line(x, track.y, x, y1);

              if (s.peaksAreMirrored)
                line(x, y2, x, track.y);
            }
          }
        , init = function() {
          textFont('monospace');
        };

      init();

      return {draw};
    }();

    let score = function() {

      let yPos1 = height - 40
        , yPos2 = height - 20
        , format = function(millis) {
          return `${floor(millis/1000)}:${floor(((millis%1000)/10))}`;
        }
        , draw = function(time) {
          stroke(255);
          strokeWeight(2);
          fill(0);
          textSize(18);
          textAlign("left");
          text(format(time.current), 40, yPos1);
          text(`${format(time.best)} best`, 40, yPos2);
        };

      return {draw};
    }();

    let countIn = function() {
      let countText = ['Ready?', 'Click to GO!']
        , stepDuration = fr // once per second
        , start;

      let draw = function(callback) {
        if (!start) {
          start = frameCount;
        }

        let i = floor((frameCount - start) / stepDuration);
        if (i < countText.length) {
          stroke(255);
          strokeWeight(2);
          textSize(32);
          textAlign('center');
          text(countText[i], width/2, height/2);
        }
        else {
          start = undefined;
          s.drawCountdown = false;
          // NOTE: currently only works because the countIn is the last in
          // TODO: needs a robust method of finding itself
          drawQ.pop();
          if (typeof callback === 'function') {
            callback();
          }
        }
      };

      let drawFactory = function(callback) {
        return function() {
          draw(callback);
        }
      }

      return {draw, drawFactory};
    }();

    this.score = score;

    this.countIn = function(callback) {
      s.drawCountdown = true;
      drawQ.push(
        typeof callback === 'function'
          ? countIn.drawFactory(callback)
          : countIn.draw
        );
    };

    this.draw = function() {
      if (drawQ.length > 0)
        drawQ.forEach(func => {
          func();
        });

      score.draw(game.stopwatch);
    };

    // initialize
    if (s.drawWaveform) {
      drawQ.push(waveform.draw);
    }
    // if (s.drawCountdown)
    //   drawQ.push(countIn.draw);
  };

  let TunnelManager = function(settings) { // t::todo convert to a class (fun, nth)

    /*
      exposed
      getVertices
      getY
        position: top, bottom, center, bounds
        position type object {x,y}
    */

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

    self.limits = new function() {

      let self = this;
      let offset = height*.30
      let frameRateToIncreaseOffset = fr/3;
      self.offset = offset;
      self.multiplier = 0.30;
      self.update = function() {
        // these are the extremes used to map the peak values to
        self.lower = round(height * self.multiplier);
        self.upper = round(height * (1 - self.multiplier));
        // modify the tunnel girth when x playing time has passed
        if (
          player
          && frameCount % frameRateToIncreaseOffset === 0
          && player.mode != 'limbo'
        )
          self.offset--;
      };
      self.reset = function() {
        self.offset = offset;
      };
      self.getGrowth = function() {
        return self.offset - offset;
      };
      self.keepDrawingWaves = function(i) {
        // the logic here is wrong
        // TODO: fix it
        // it's supposed to check the wave is inside the screen bounds
        // might not be needed as the tunnel no longer grows, but rather shrinks
        return (self.offset -  offset)/(frameRateToIncreaseOffset/2) < i;
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
/*
    this.onOrientationChange = function() { // not begin used so far
      waveWidth = Math.round(sound.duration() * width);
      peakDistance = width / settings.peaksPerScreen;
      frameDistance = width / fr;
    };
*/
    let updateVertices = function() {

      let rawVs = [];
      vertices = [];
      offsetY = (!self.reactsToBass)
        ? self.limits.offset
        : self.limits.offset + round(map(audio.energy.bass, 0, 255, 0, self.maxOffsetY));

      // get the raw vertices
      for (let i=0; i < settings.peaksPerScreen+settings.peaksPerScreenBuffer; i++) {

        let j = i + ceil(positionX/peakDistance); // must be ceil
        let x = i * peakDistance;
        let y = map(self.peaks[j], -1, 1, self.limits.lower, self.limits.upper);

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
      self.positionX = positionX;
    };

    // let updateOffsetY = function() {
    //
    // };

    let updateVars = function() {
      self.limits.update();
      updateVertices();
      updateOffsetX();
      updatePositionX();
    };

    this.draw = function() {

      if (sound.isPlaying())
        updateVars();

      beginShape();
      fill(themes.active.bg);
      // stroke(255 - sound.getVolume() * 255); // temporarilly disable fading out
      // noFill();
      stroke(125);
      strokeWeight(6);

      for (let v of vertices) {
        vertex(v.x, v.y);
      }
      endShape();
    };

    this.getVertices = function(xPosition = 'center') {
      if (!vertices) // when no sound has been analised but another object wants the vertices
        return false;

      switch(xPosition) {
        case 'center':
          return vertices.filter(v => {
            // get the two vertices either side of the horizontal center
            return v.x >= center.x - peakDistance && v.x <= center.x + peakDistance;
          });

        case 'right':
          return vertices.filter(v => {
            // get the two vertices either side of the horizontal center
            return v.x >= width - peakDistance && v.x <= width + peakDistance;
          });
      }
    };

    this.getY = function(pos) {

      let vs = this.getVertices( typeof pos === 'string' ? 'center' : pos.x );

      if (!vs)
        return 0;

      let adj = vs[1].x - vs[0].x; // same as peakDistance but rounded
      let oppOnRight = vs[0].y > vs[1].y;
      let opp = oppOnRight ? vs[0].y - vs[1].y : vs[1].y - vs[0].y;
      let rad = atan(opp/adj);
      let adjToCenter = typeof pos === 'string'
        ? oppOnRight ? center.x - vs[0].x : vs[1].x - center.x
        : oppOnRight ? width - vs[0].x : vs[1].x - width;
      let oppAtCenter = adjToCenter * tan(rad);
      let y = oppOnRight ? vs[0].y - oppAtCenter : vs[1].y - oppAtCenter; // topmost point of the linedraw between vertices

      switch(typeof pos)
      {
        case 'string':
          switch (pos)
          {
            case 'top':
            return y;

            case 'bottom':
            return y + offsetY*2; // the distance between top and bottom

            case 'center':
            return y + offsetY; // by the half distance between top and bottom

            case 'bounds':
            return {top: y, bottom: y + offsetY * 2};
          }
          break;

        // to begin with an object being passed in will be for the power up
        // so we shall keep it simple and expand later when needed
        case 'object':
          switch(pos.y) {
            case 'bounds':
              return {top: y, bottom: y + offsetY * 2};
          }
      }
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }

    // Initialize
    updateVertices();
  };

  /*============
    #PowerUp
  */

  let PowerUp = function() {

    // need to get the yOffset from the tunnel musicManager
    // which really needs to become it's own manager
    this.isOnStage = false;

    let self = this
      , type
      , initialX
      , x
      , y
      , diameter = self.diameter = 16
      , padding = 20
      , update = function() {

        if (!self.isOnStage) {
          return;
        }
        let {top, bottom} = tunnel.getY({x: 'right', y: 'bounds'});

        if (!initialX) {
          initialX = tunnel.positionX;
          self.y = y = top + random((bottom - padding) - (top + padding));
        }

        self.x = x = width - (tunnel.positionX - initialX);

        if (tunnel.positionX - initialX > width) {
          initialX = undefined;
          self.isOnStage = false;
        }

        detectCollision();
      }
      , detectCollision = function() {

        if (
          self.isOnStage &&
          self.x + self.diameter > player.x
        )
        {
          if (collideCircleCircle(player.x, player.y, player.diameter, powerUp.x, powerUp.y, powerUp.diameter))
          {
            powerUp.remove();
            activate[type]();
          }
        }
      }
      , draw = {
        hue: function() {
          colorMode(HSB);
          fill(themes.active.getColor('comp'));
          triangle(x, y, x - diameter/2, y + diameter, x + diameter/2, y + diameter);
        },
        moon: function() {
          // two circles, one smaller and close to the larger
          fill(themes.active.getColor('comp'));
          ellipse(x,y, diameter, diameter);
          ellipse(
            x + diameter * .75,
            y + diameter * .75,
            diameter * .25,
            diameter * .25
          );
        }
      }
      , activate = {
        hue: function() {
          themes.active.rotate(180);
        },
        moon: function() {
          moons.spawn(); // move this up
        }
      };

    this.remove = function() {
      self.isOnStage = false;
      initialX = undefined;
    };

    this.spawn = function() {
      type = floor(random(2)) ? 'hue' : 'moon';
      this.isOnStage = true;
    };

    this.draw = function() {

      if (!this.isOnStage) {
        return;
      }
      update();
      draw[type]();
    };
  };

  /*=============
    #Moon
  */

  let MoonConmplex = function(planet, options) {

    let self = this
      , count = 0
      , moons = []
      , typeList = ['bass', 'mid', 'treble']
      , dirList = ['clockwise', 'counter']
      , defaults = {
          freq: 'bass',
          revSec: 1,
          limit: 3
          // maxDiameter: planet.radius,
        }
      , s = $.extend({}, defaults, options) // settings
      , degree = 360 / (fr / s.revSec) // full revolution per second
      , radian = radians(degree); // the increment around the circle in radians

    let Moon = function(type) { // bass, mid, treble
      // VARS: x, y, colour, diam, type
      // FUNC: sleep/destruct, update, draw
      let self = this
        , x
        , y
        , color
        , diam
        , freq = type
        , dir = dirList[count%2]
        //functions
        , update = function () {
          // calculate the diameter
          // get magnitude from sound.getEnergy
          diam = map(audio.energy[freq], 0, 255, 0, planet.radius);
          // get x and y using trigonometry
          let coord = getCoord(type, dir); // NOTE: check this works
          x = coord.x;
          y = coord.y;
          // get the colour and shift the Hue
          color = getColor(type);
        };

        this.draw = function() {

          update();

          if (sketchSettings.audioColorMode === "HSB")
            colorMode(HSB);
          // draw the bugger to the canvas
          noStroke(0);
          fill(color);
          ellipse(x, y, diam, diam);
        };

        this.destory = function() {
          // remove reference of self from the Array
        };

    };

    let getCoord = function(freq, dir) {

      //  returns progression around the circle every frame
      let i = dir === 'clockwise'
        ? frameCount % fr : abs(frameCount % fr -360) // counter clockwise
        , x
        , y
        , hypotenuse = map(audio.energy[freq], 0, 255, planet.radius, planet.radius * 14); // 0 means able to drop into the planet

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
          break;
      }

      return {
        x: x + planet.x,
        y: y + planet.y
      }
    };

    let getColor = function () {
      // NOTE: later to put in logic produce colors, complemetary, Hue shift
      return themes.active.wall;
    }

    this.spawn = function (freq = 'bass') {
      count++;
      if (count>0)
      {
        moons[
          moons.length < s.limit ? 'push' : 'pop'
        ](new Moon(typeList[count % 3]));
      }
    };

    this.draw = function() {
      if (!count)
        return;

      moons.forEach(moon => {
        moon.draw();
      });

    };
  };

/*=========
  #Player
*/

  let Player = function() {

    let self = this;
    let x = self.x = center.x;
    let y = self.y = center.y; // begin at center
    let velocity = 0;
    self.minDiameter = 10;
    self.maxDiameter = self.minDiameter * 4;
    let diameter = self.diameter = self.minDiameter;

    const GRAVITY = .3;
    const THRUST = -5;

    let resetOnFrame;

    self.mode = "reset";

    let getAcceleration = function() {
      // acceleration - gravity
      return acceleration;
    };

    let updateVars = function() {

      let updateY = function() {

        let spaceIsPressed = keyIsDown(32);

        if (mouseIsPressed || spaceIsPressed)
          velocity = THRUST;

        velocity += GRAVITY;

        if (y <= height && y > 0) {
          y += velocity;
        }
        else if (y > height) {
          y = height;
        }
        else if (y < 0) {
          y = 0;
        }
      };

      switch(self.mode) {

        case 'play':
          updateY();
          break;

        case 'reset':
          y = tunnel.getY('center');
          self.mode = 'limbo';
          $(document).trigger({type: 'volume:change', level: 0.1});
          uiControls.countIn(function() {
            return function() {
              $(document).one('thrust', function() {
                audio.toggle();
                resetOnFrame = frameCount;
                self.mode = 'recovering';
              });
            }
          }());
          break;

        case 'limbo':
          y = tunnel.getY('center');
          break;

        case 'recovering':

          if (sound.getVolume() < 1) {
            $(document).trigger({
              type: 'volume:change',
              level: ((frameCount-resetOnFrame)/18)/10
            });
          }
          else {
            self.mode = 'play';
          }
          updateY();
          break;

        default: break;
      }

      diameter = map(audio.energy.bass, 100, 255, self.minDiameter, self.maxDiameter);
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

/*
  =========
  #Wavy
*/

  let Wavy = function(orientation = 'tunnel') {

    let minX, maxX, minY, maxY, offsetBaseUnit
      , prevWaves = []
      , prevColors = []
      , self = this;

    self.waveWeight = 20;
    self.waveEchoLimit = 5;

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
        offsetBaseUnit = height/4;
        break;
    }

    let updateVars = function() {
      switch(orientation) {
        case 'tunnel':
          minY = tunnel.getY('top');
          maxY = tunnel.getY('bottom');
          break;

        case 'outer':
          minY = tunnel.getY('top');// -100;
          maxY = tunnel.getY('bottom');// +100;
          break;
      }
    }
      , getWave = function() {

          let vertices = [];

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
            vertices.push({x,y});
          }

          return vertices;
      }
      , drawCurrent = function() {

    }
      , drawPrevious = function() {

          if (prevWaves.length === 0)
            return;

          noFill();
          strokeWeight(self.waveWeight);
          strokeCap(PROJECT);

          let limit = prevWaves.length < self.waveEchoLimit ? prevWaves.length : self.waveEchoLimit;

          for (let j=0; j<limit; j++)
          {
            let offset = offsetBaseUnit + (
              self.waveWeight > 1
                ? j * (self.waveWeight * 0.5)
                : 0
            )
              , strokeColor = orientation === 'outer' ? prevColors[j] : 255-offset
              ;

            beginShape();
            stroke(strokeColor); // waveform is progressive shades away from white

            for (
              let k=0;
              k < prevWaves[j].length;
              k += k===0 ? 15 : 16 // bring the resolution right down
            ) {

              switch(orientation) {
                case 'tunnel':
                case 'vertical':
                vertex(
                  prevWaves[j][k].x - offset,
                  prevWaves[j][k].y
                );
                break;

                case 'horizontal':
                vertex(
                  prevWaves[j][k].x,
                  prevWaves[j][k].y - minY - offset
                );
                break;

                case 'outer':
                vertex(
                  prevWaves[j][k].x,
                  prevWaves[j][k].y - offset
                );
                break;
              }
            }
            endShape();

            // if it is the outer then draw a bottom repetition of the prev waves
            if (orientation === 'outer') {
              beginShape();
              stroke(strokeColor);
              for (
                let l=0;
                l < prevWaves[j].length;
                l += l===0 ? 15 : 16 // abstract this value
                // l += self.waveWeight > 1 ? 16 : 4 // abstract this value
              ) {
                vertex(
                  prevWaves[j][l].x,
                  prevWaves[j][l].y + offset
                );
              }
              endShape();
            }

            // if (tunnel.limits.keepDrawingWaves(j+1)) // how many waveforms to display depends on tunnel growth
            //   return;
          }
    };

    this.draw = function() {

      updateVars();

      let wave = getWave()
        , frameDivider = 3;

      beginShape();
      noFill();
      stroke(25); // waveform is white

      if (orientation === "outer")
        strokeWeight(tunnel.limits.upper - tunnel.limits.lower);

      wave.forEach(w => {
        vertex(w.x,w.y);
      });
      endShape();

      if (frameCount%frameDivider === 0) {
        prevWaves.unshift(wave);
        prevColors.unshift(themes.active.wall);
      }

      if (prevWaves.length > 5)
      {
        prevWaves.pop();
        prevColors.pop();
      }

      drawPrevious();

    };
  };

  /*
    =======================
    #CircularWaveform
  */

  let CircularWaveform = function(multiplier = 400) {

    let self = this;
    let radius = this.radius = 20; // px
    // we shall begin by doing a quarter circle
    let degree = 360/bins;
    let radian = radians(degree); // the increment around the circle in radians
    let vectors;

    // let prevVectorsLength = 5; // 60 frames of old vectors = 1 second
    // let prevVectorsIsFull = false;
    // let prevVectors = this.prevVectors = new Array();
    let frameRange = 1;
/*
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
    let getPrevVectors = function() {
      return prevVectors; // necessary??? ::Todo:: Check
    };
*/
    this.draw = function() {

      let waveform = audio.waveform, x, y;
      // vectors = [];

      fill(255);
      noStroke();
      beginShape();
      // stroke(255,255,255); // waveform is white
      // strokeWeight(1);

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

        // vectors.push(createVector(x, y));
      }

      endShape();
      //
      // if (frameCount % frameRange === 0)
      // {
      //   if (!prevVectorsIsFull) {
      //     prevVectorsIsFull = prevVectors.length == prevVectorsLength;
      //   }
      //   else {
      //     prevVectors.pop();
      //   }
      //   prevVectors.unshift(vectors);
      // }

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

    $(document).trigger('sketch:ready');
    // collideDebug(true);
    frameRate(fr);
    cnv = createCanvas(600, 400); //windowWidth, windowHeight
    cnv.parent('canvas');
/*
    cnv.mousePressed(function() {
      if (!sound.isPlaying())
        player.mode = 'reset';
    });
*/
    sound.amp(1, 1);
    center.x = width / 2;
    center.y = height / 2;

    game = new GameController();
    audio = new AudioController();

    player = new Player();
    circular = new CircularWaveform();
    tunnel = new TunnelManager(sketchSettings);
    powerUp = new PowerUp();
    waveform = new Wavy('outer');
    uiControls = new UIController();
    moons = new MoonConmplex(player);

    drawQ = [ // ordering matters will decide the stacking
      waveform, tunnel, player, powerUp, moons, uiControls/*, circular*/
    ];

    // particles = new VectorParticles(circleWave);

    $(document).on('volume:change', function(ev) {
      console.log(ev.level);
      sound.setVolume(ev.level);
    });

    background(0);
    audio.toggle();

    self.game = game;
    self.sound = sound;
    self.audio = audio;
    self.uiControls = uiControls;
    self.tunnel = tunnel;
    self.player = player;
    self.themes = themes;
    self.powerUp = powerUp;

    initDatGUI();
  };

  window.draw = function() {
    game.update();

    if (themes.active.repaintBg) {
      // background(themes.active.wall);
      background(0);
    }

    drawQ.forEach(ob => { ob.draw(); });
  };


// Processing Events
  window.windowResized = function() {
    resizeCanvas(600, 400); //windowWidth, windowHeight
    center.x = width / 2;
    center.y = height / 2;
  };

  window.keyPressed = function(ev) {
    switch(keyCode)
    {
      case ESCAPE: audio.toggle(); break;
      case ENTER: saveCanvas('canvas_capture', 'png'); break;
      /* case DOWN_ARROW: player.mode = "reset"; break; */
    }
  };


/*
  -----------------------
  Processing Loop -  end
  -----------------------
*/

  let activeTheme = themes.active;
  let initDatGUI = function() {
    let gui = new dat.GUI();
    let controller = gui.add(sketchSettings, 'peaksPerScreen', 2, 10).step(1);

    controller.onFinishChange(function(value) {
      this.object.updateValues();
    });

    gui.add(activeTheme, 'repaintBg');
    gui.add(waveform, 'waveWeight', 1, 100).step(1);
    gui.add(waveform, 'waveEchoLimit', 1, 5).step(1);
    // gui.add(tunnel, 'limits', 0.1, 0.9);
    gui.add(tunnel, 'maxOffsetY', -30, 30);
    gui.add(tunnel, 'reactsToBass');
    gui.add(player, 'maxDiameter', 0, 100);
    gui.add(player, 'minDiameter', 0, 100);
    gui.add(uiControls, 'peakHeightMultiplier', -100, 100);
  };

  /* Hacking, need to fire a window load event to have P5 run the sketch code */
  window.dispatchEvent(new Event('load')); // this is window
};
