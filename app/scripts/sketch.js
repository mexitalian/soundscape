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

var sketch = function(p) {

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
      , line = {
          length: p.width/2,
          x1: p.width*.25,
          x2: p.width*.75,
          y: p.height - 30
      }
      , ph = { // playhead
          width: 12,
          height: 12,
          x: line.x1,
          y: line.y,
          xIncr: line.length / duration,
          updateX: function() {
            // only update once every 250 ms
            // can be taken out to improve smoothness, is an effort at killing overhead
            if (p.frameCount % (fr/4) !== 0) {
              return;
            }
            console.log(sound.currentTime());
            this.x = line.x1 + this.xIncr * sound.currentTime();
          }
      };

    this.draw = function() {
      ph.updateX();

      p.strokeWeight(2);
      p.stroke(0);
      p.line(line.x1, line.y, line.x2, line.y);
      p.noStroke();
      p.fill(255);
      p.ellipse(ph.x, ph.y, ph.width, ph.height);
    }
  };

  let WaveformManager = function(sound, peaksPerScreen, secondsPerScreen) { // t::todo convert to a class (fun, nth)

    let waveWidth = Math.floor(sound.duration() * p.width);
    let peakDistance = p.width / peaksPerScreen;
    let frameDistance = p.width / fr;
    let peakResolution = sound.duration() * 4; // t::todo needs to account for parts of a second
    let peaks = sound.getPeaks(peakResolution); // waveform for full audio <- add resolution here

    let positionX = 0;
    let offsetX = 0;
    let maxOffsetY = 30;
    let vertices;

    this.onOrientationChange = function() {
      waveWidth = Math.floor(sound.duration() * p.width);
      peakDistance = p.width / peaksPerScreen;
      frameDistance = p.width / fr;
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

      vertices = [];

      for (let i=0; i < peaksPerScreen+peaksPerScreenBuffer; i++) {

        let j = i + Math.floor(positionX/peakDistance);
        let x = Math.floor(i * peakDistance);
        let y = Math.round( p.map(peaks[j], -1, 1, p.height/8, p.height-(p.height/8)) );
/*
        vertices.push([
          Math.floor(i * peakDistance),//Math.round((peakDistance/2) + (i * peakDistance)),
          Math.round( p.map(peaks[j], -1, 1, p.height/8, p.height-(p.height/8)) )
        ]);
*/
        vertices.push( p.createVector(x, y) );
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

      p.beginShape();
      p.fill(themes.active.bg);
      p.stroke(themes.active.bg);
      p.strokeWeight(1);

      let yOffset = p.map(audioProperties.energy.bass, 0, 255, 0, maxOffsetY) + p.height/4;
      // let yOffset = p.height/4;

      // upper limit
      for (let v of vertices) {
        // p.vertex(v.x - offsetX, v.y - p.height/4); // old values, static y
        p.vertex(v.x - offsetX, v.y - yOffset);
      }

      // lower limit
      for (let v of vertices.reverse()) {
        // p.vertex(v.x - offsetX, p.height/4 + v.y); // same reason as above
        p.vertex(v.x - offsetX, yOffset + v.y);
      }
      p.endShape();
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
      newDiameter = p.map(fftValues.energy[frequency], 0, 255, 0, diameter);
      self.radius = newDiameter/2;
    };

    let updateCoords = function() {
      //  give me back the progression around the circle every frame
      let i = p.frameCount % (fr*(frequency === "bass" ? 2 : 1));
      let hypotenuse = planet.radius + p.map(fftValues.energy[frequency], 0, 255, diameter, maxOrbitDistance);

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
      p.fill(255);
      p.ellipse(x, y, newDiameter, newDiameter);
    };
  };

  let PlayerManager = function() {

    let y = center.y; // begin at center
    let maxDiameter = 75;
    let hasThrust = false;

    $(document).on("thrust", function() {
      hasThrust = true;
    });
    $(document).on("gravity", function() {
      hasThrust = false;
    });

    let getY = function() {
      return y;
    };

    let draw = function() {

      if (y<p.height && y>0) {
        y = p.mouseIsPressed ? y-2 : y+4;
      }
      else if (y==p.height && p.mouseIsPressed) {
        y -= 2;
      }
      else if (y==0 && !p.mouseIsPressed) {
        y += 4;
      }
      else if (y>p.height) {
        y = p.height;
      }
      else if (y<0) {
        y = 0;
      }

      let diameter = p.map(audioProperties.energy.bass, 0, 255, 0, maxDiameter);

      p.noStroke();
      p.fill(255);
      p.ellipse(center.x, y, diameter, diameter);
    }

    return {draw, getY};
  };



  let Wavy = function() {
    let draw = function() {
      let waveform = fft.waveform();
      p.noFill();
      p.beginShape();
      p.stroke(255,255,255); // waveform is red
      p.strokeWeight(1);

      // console.log(`waveform: ${waveform.length}`);

      for (var i = 0; i< waveform.length; i++){
        var x = p.map(i, 0, waveform.length, 0, p.width);
        var y = p.map( waveform[i], -1, 1, 0, p.height);
        p.vertex(x,y);
      }
      p.endShape();
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

      p.fill(255);
      p.beginShape();
      p.stroke(255,255,255); // waveform is white
      p.strokeWeight(1);

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

        p.vertex(x, y);

        vectors.push(p.createVector(x, y));
      }

      p.endShape();

      if (p.frameCount % frameRange === 0)
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

        p.stroke(255, opacity);
        p.strokeWeight(weight);

        for (let vector of vectors) {
          p.point(vector.x, vector.y);
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

  p.preload = function() {
    sound = p.loadSound(url); // put in the soundcloud retrieved URL
    // sound = p.loadSound('../media/hayley.mp3');
  };

  p.setup = function() {
    console.log(sound);
/*
    p.collideDebug(true);
    poly[0] = p.createVector(123,231);     // set X/Y position
    poly[1] = p.createVector(10,111);
    poly[2] = p.createVector(20,23);
    poly[3] = p.createVector(390,33);
*/
    p.frameRate(fr);
    cnv = p.createCanvas(p.windowWidth, p.windowHeight);

    // cnv.mouseClicked(togglePlay);

    fft = new p5.FFT(0.8, bins); // 0.8 is default smoothing value
    sound.amp(0.2);
    center.x = p.width / 2;
    center.y = p.height / 2;

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

    p.background(0);
    togglePlay();

  };

  p.draw = function() {
    if (sound.isPlaying()) {
      p.background(themes.active.wall);
      audioProperties.update();

      drawQueue.forEach(ob => { ob.draw(); });
    }


/*
    //draw the polygon from the created Vectors above.
    p.beginShape();
    for(let i=0; i < poly.length; i++){
        p.vertex(poly[i].x,poly[i].y);
    }
    p.endShape(p.CLOSE);



    p.ellipse(p.mouseX,p.mouseY,45,45);

    // hit = collideCirclePoly(mouseX,mouseY,45,poly,true);
    hit = p.collideCirclePoly.apply(p, [p.mouseX,p.mouseY,45,poly]);
    //enable the hit detection if the circle is wholly inside the polygon
    print("colliding? " + hit);
*/
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    center.x = p.width / 2;
    center.y = p.height / 2;
  };

  p.keyPressed = function(ev) {
    if (p.keyCode === p.ESCAPE) {
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

};
