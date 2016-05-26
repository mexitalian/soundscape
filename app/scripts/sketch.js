var sketch = function(p) {

  let sound, fft;
  let fr = 60;
  let SPEED = 1;
  let peaksPerScreen = 3;
  let peaksPerScreenBuffer = 2;
  let bins = 256;

  let cnv; // canvas
  let waveManager, player, wavy, circleWave, particles, satellite;
  let url = audioPlayer.urls[ Math.floor(Math.random() * audioPlayer.urls.length) ];

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
    let vertices;

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
      p.fill(255,0,0);
      p.stroke(255,0,0);
      p.strokeWeight(1);

      // upper limit
      for (let v of vertices) {
        p.vertex(v.x - offsetX, v.y - p.height/4);
      }

      // lower limit
      for (let v of vertices.reverse()) {
        p.vertex(v.x - offsetX, p.height/4 + v.y);
      }
      p.endShape();
    };

    // cue points
    // for (let i=0; i < Math.floor(sound.duration()); i++) {
    //   sound.addCue(i, updateVertices);
    // }
  };

  let Satellite = function(planet) {

    // fuck you internal critic, I'll be a baillerina
    let degree = 360/fr;
    let radian = Math.radians(degree); // the increment around the circle in radians
    let diameter = 40;
    let distanceFromPlanet = 30;
    let x, y;
    // how do I move something move around a circle

    let getDiameter = function() {
      return p.map(fft.getEnergy("bass"), 0, 255, 0, diameter);
    };

    let getCoords = function() {
      //  give me back the progression around the circle every frame
      let i = p.frameCount % fr;
      let hypotenuse = planet.radius + p.map(fft.getEnergy("bass"), 0, 255, distanceFromPlanet, distanceFromPlanet*4);

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
      x = x + planet.centerX;
      y = y + planet.centerY;

      return {x, y};
    };

    let draw = function() {

      fft.analyze();

      let coords = getCoords();
      let diameter = getDiameter();
      p.fill(255);
      p.ellipse(coords.x, coords.y, diameter, diameter);
    };

    return {draw};
  };

  let PlayerManager = function() {

    let x = p.width / 2; // x is always the same, center of screen
    let y = p.height / 2; // begin at center
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
        y = hasThrust ? y-2 : y+4;
      }
      else if (y>=p.height && hasThrust) {
        y -= 2;
      }
      else if (y<=0 && !hasThrust) {
        y += 4;
      }

      fft.analyze();
      let diameter = p.map(fft.getEnergy("bass"), 0, 255, 0, maxDiameter);
      // let grayscale = Math.floor( fft.getEnergy("bass") );
      p.fill(255);
      p.ellipse(x, y, diameter, diameter); // x, y, w, h
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

  let CircularWaveform = function(centerX = p.width/2, centerY = p.height/2, multiplier = 300) {

    let radius = 50; // px
    // we shall begin by doing a quarter circle
    let degree = 360/bins;
    let radian = Math.radians(degree); // the increment around the circle in radians
    let vectors;

    let prevVectorsLength = 5; // 60 frames of old vectors = 1 second
    let prevVectorsIsFull = false;
    let prevVectors = new Array();

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
    let draw = function() {

      let waveform = fft.waveform(), x, y;
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

        // put the waveform in the center
        x = x + centerX;
        y = (typeof centerY === "function") ? y + centerY() : y + centerY;

        p.vertex(x, y);

        // console.log(radian*i);
        // console.log(vector.heading());

        vectors.push(p.createVector(x, y));
        }

      // }

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

    }
    return {draw, prevVectors, radius, centerX, centerY};
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
/*
    p.collideDebug(true);
    poly[0] = p.createVector(123,231);     // set X/Y position
    poly[1] = p.createVector(10,111);
    poly[2] = p.createVector(20,23);
    poly[3] = p.createVector(390,33);
*/
    p.frameRate(fr);
    cnv = p.createCanvas(p.windowWidth, 400);
    cnv.mouseClicked(togglePlay);
    fft = new p5.FFT(0.8, bins); // 0.8 is default smoothing value
    sound.amp(0.2);
    waveManager = new WaveformManager(sound, peaksPerScreen, SPEED);
    player = new PlayerManager();
    // wavy = new Wavy();
    circleWave = new CircularWaveform(/*p.width/2, player.getY*/);
    particles = new VectorParticles(circleWave);
    satellite = new Satellite(circleWave);

    p.background(0);
  };

  p.draw = function() {
    if (sound.isPlaying()) {
      p.background(0);
      waveManager.draw();
      player.draw();
      // wavy.draw();
      circleWave.draw();
      particles.draw();
      satellite.draw();
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
