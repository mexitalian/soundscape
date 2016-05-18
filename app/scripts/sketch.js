var sketch = function(p) {

  let sound, fft;
  let fr = 60;
  let SPEED = 1;
  let peaksPerScreen = 3;
  let peaksPerScreenBuffer = 2;

  let cnv; // canvas
  let waveManager, player, wavy;
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

  let PlayerManager = function() {

    let thrust;
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

    let draw = function() {

      y = hasThrust ? y-2 : y+4;

      fft.analyze();
      let diameter = p.map(fft.getEnergy("bass"), 0, 255, 0, maxDiameter);
      // let grayscale = Math.floor( fft.getEnergy("bass") );

      p.fill(255);
      p.ellipse(x, y, diameter, diameter); // x, y, w, h
    }

    return {draw, thrust};
  };

  let Wavy = function() {
    let draw = function() {
      let waveform = fft.waveform();
      p.noFill();
      p.beginShape();
      p.stroke(255,255,255); // waveform is red
      p.strokeWeight(1);
      console.log(`waveform: ${waveform.length}`);
      for (var i = 0; i< waveform.length; i++){
        var x = p.map(i, 0, waveform.length, 0, p.width);
        var y = p.map( waveform[i], -1, 1, 0, p.height);
        p.vertex(x,y);
      }
      p.endShape();
    };

    return { draw };
  };

// time, begin/start value, change in value, duration
Math.easeInQuart = function (t, b, c, d) {
  t /= d;
  return c*t*t*t*t + b;

  // time is irrelevant
  // [x] start value is the y co-ordinate
  // change in value is the variable
  // duration depends upon length of keypress
  // 
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
    fft = new p5.FFT();
    sound.amp(0.2);
    waveManager = new WaveformManager(sound, peaksPerScreen, SPEED);
    player = new PlayerManager();
    wavy = new Wavy();

    p.background(0);
  };

  p.draw = function() {
    if (sound.isPlaying()) {
      p.background(0);
      waveManager.draw();
      player.draw();
      wavy.draw();
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
