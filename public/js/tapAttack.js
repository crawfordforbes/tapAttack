/* tapApp.js
	 intuitive rhythm composition */


// Next steps
//   * assign one patch to each strip of the screen for play back during learning
//   * when exiting learning mode, initialize N Audio objects for each pad
//   * when entering recording mode, initialize 2-d array for each pad to hold its recordings 

// Debugging 
var useConsole = true;
function fauxConsole(str) {																					
	if(useConsole)
		document.getElementById("console").innerHTML=str;
}

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}


////////////
//  Data  //
////////////

var TapApp = {};
TapApp.kit = "808";
TapApp.recording = [];

// Program state / mode
TapApp.learning_state = 0;
TapApp.setup_state = 1;
TapApp.recording_state = 2;
TapApp.freeplay_state = 3;
TapApp.playback_state = 4;
TapApp.loadingSamples_state = 5;

TapApp.state = TapApp.learning_state;

TapApp.buttonArray = [];
TapApp.stateButtonArray = [];
TapApp.regionNodeArray = [];

/////////////////
//  Constants  // 
/////////////////

TapApp.button_delay = 100;

TapApp.threshold = 100;

TapApp.r1 = 50;	// radius used to designate "center" of region
TapApp.r2 = 70;


TapApp.audioDirectory = "./mp3/";
TapApp.patches = ["hightom", "hi_conga", "kick1", "kick2", "maracas", "open_hh", "rimshot", "snare", "tom1" ];
TapApp.sampleSuffix = ".mp3";
TapApp.samplesPerRegion = 12;
TapApp.sampleLoadDelay = 100;

// Maybe convert these to objects later
TapApp.learningStripData = [
		[.3, "#F00", "kick1", 0], 
		[.6, "#F80", "snare", 0],
		[.8, "#0D0", "open_hh", 0], 
		[ 1, "#00F", "rimshot", 0]
];

TapApp.patchHash = {
	"hi tom": "hightom", 
	"kick": "kick",
	"open hat": "open_hh",
	"rimshot": "rimshot",
	"snare": "snare",
	"tom": "tom1"
};


////////////// 
//  Colors  //
////////////// 
var hexDigits = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' ];
function toHex(i) { return hexDigits[Math.floor(i/16)] + hexDigits[i%16]; }

function rgb(red, green, blue) { return "#" + toHex(red) + toHex(green) + toHex(blue); }

function arbitraryColor() {
	var color = "#";
	for(var i = 0; i < 3; i++) {
		var c = Math.floor(Math.random() * 256);
		color = color + toHex(c);
	}
	return color;
}


///////////////
//  Buttons  //
///////////////

var buttonProto = {
	x: -1,
	y: -1,
	w: -1,
	h: -1,
	name: "proto",
	sCol: "#000",
	fCol: "#000",
	afCol: "#030",
	active: false,

	display: function(ctx) {
		var dispX = this.x;
		var dispY = this.y;
		ctx.strokeStyle = this.sCol;
		if(this.active) {
			ctx.fillStyle = this.afCol;
			ctx.lineWidth = 5;
		} else {
			ctx.fillStyle = this.fCol;
			ctx.lineWidth = 3;
		}
		ctx.strokeRect(dispX, dispY, this.w, this.h);
		ctx.fillRect(dispX, dispY, this.w, this.h);
	},

	within: function(mx, my) {
		return (this.x < mx && mx < this.x+this.w && this.y < my && my < this.y+this.h);
	},

	onpress: function(ctx) {
		this.active = true;
		console.log("pressed the prototype button, or a carelessly constructed descendant");
		refresh();
	},

	onrelease: function(ctx) {
		this.active = false;
		refresh();
	},

	init: function(x, y, w, h, fCol, afCol) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.fCol = fCol;
		this.afCol = afCol;
	}
	
};

TapApp.learningButton = Object.create(buttonProto);
TapApp.learningButton.init(10, 10, 40, 40, "#EE0", "#FF0");
TapApp.learningButton.onpress = function() {
	setState(TapApp.learning_state);
	TapApp.regionTree = undefined;
	TapApp.regionArray = [];
	refresh();
};

TapApp.setupButton = Object.create(buttonProto);
TapApp.setupButton.init(60, 10, 40, 40, "#555", "#444");
TapApp.setupButton.onpress = function() {
	setState(TapApp.setup_state);
};

TapApp.recordButton = Object.create(buttonProto);
TapApp.recordButton.init(160, 10, 40, 40, "#E00", "#F00")
TapApp.recordButton.onpress = function() {
	setState(TapApp.recording_state);
	startRecording();
};

TapApp.stopButton = Object.create(buttonProto);
TapApp.stopButton.init(210, 10, 40, 40, "#00F", "#33F");
TapApp.stopButton.onpress = function() {
	setState(TapApp.freeplay_state);
};

TapApp.playButton = Object.create(buttonProto);
TapApp.playButton.init(260, 10, 40, 40, "#0A0", "#3F3");
TapApp.playButton.onpress = function() {
	setState(TapApp.playback_state);
};

function setState(newState) {
	console.log("Setting state from " + TapApp.state + " to " + newState);
	if(newState !== TapApp.learning_state && TapApp.state === TapApp.learning_state) {
		loadAllSamples();
	} else if(newState === TapApp.recording_state) {
		startRecording();
	} else if(TapApp.state === TapApp.recording_state) {
		stopRecording();
	} else if(TapApp.state === TapApp.playback_state) {
		stopPlayback();
	}
	for(var i = 0; i < TapApp.stateButtonArray.length; i++) {
		if(i === newState) {
			TapApp.stateButtonArray[i].active = true;
		} else {
			TapApp.stateButtonArray[i].active = false;
		}
	}
	TapApp.state = newState;
	refresh();
};


TapApp.buttonArray.push(TapApp.learningButton);
TapApp.buttonArray.push(TapApp.setupButton);
TapApp.buttonArray.push(TapApp.recordButton);
TapApp.buttonArray.push(TapApp.stopButton);
TapApp.buttonArray.push(TapApp.playButton);

TapApp.stateButtonArray.push(TapApp.learningButton);
TapApp.stateButtonArray.push(TapApp.setupButton);
TapApp.stateButtonArray.push(TapApp.recordButton);
TapApp.stateButtonArray.push(TapApp.stopButton);
TapApp.stateButtonArray.push(TapApp.playButton);

/////////////////////
// Learning Strips //
/////////////////////
TapApp.learningStripSamples = [];

function initializeLearningStrips(numSamples) {
	for (strip in TapApp.learningStripData) {
		TapApp.learningStripSamples.push([]);
		for(var i = 0; i < numSamples; i++) {
			TapApp.learningStripSamples[strip].push(
				new Audio( TapApp.audioDirectory + TapApp.kit + "-" + TapApp.learningStripData[strip][2] + TapApp.sampleSuffix)
			);
		}
	}
}

function playStripSample(i) {
	console.log("Playing the " + TapApp.learningStripData[i][3] + "th copy (out of " + TapApp.learningStripSamples[i].length 
		+ " of learning strip sample " + i);
	TapApp.learningStripSamples[i][TapApp.learningStripData[i][3]].play();
	TapApp.learningStripData[i][3] = (TapApp.learningStripData[i][3] + 1) % TapApp.learningStripSamples[i].length;
}

function getStrip(y) {
	for(i = 0; i < TapApp.learningStripData.length && (1-(y/surface.height) > TapApp.learningStripData[i][0]); i++)
		;
	console.log("Need the " + i + "th learning strip");
	return i;
}

///////////////
//  Regions  //
///////////////
var regionArray = [];

var regionProto = {
	id: 0,
	x: -1,
	y: -1,
	sampleName:  "kick1",
	color: "#FF0000",
	active: false,
	samples: [],
	sampleCounter: 0,
	numSamples: 0,

	display: function(ctx) {
		ctx.fillStyle = this.color;
		ctx.beginPath();
		if(this.active)
			ctx.arc(this.x, this.y, TapApp.r2, 0,2*Math.PI);
		else 
			ctx.arc(this.x, this.y, TapApp.r1, 0,2*Math.PI);
		ctx.closePath();
		ctx.fill();
	},

	scale: function(scaleX, scaleY) {
		this.x *= scaleX;
		this.y *= scaleY;
	},

	play: function() {
		console.log("Playing region " + this.id + " during state " + TapApp.state);
		this.active = true;
		refresh();
		console.log("Need to play sample " + this.sampleCounter + " of " + this.samples.length);
		if(TapApp.state === TapApp.learning_state) {
			var stripNum = getStrip(this.y);
			playStripSample(stripNum);
		} else {
			this.samples[this.sampleCounter].play();
			this.sampleCounter = (this.sampleCounter + 1) % this.numSamples;
		}
		var i = this.id;
		setTimeout( 
			function() { 
				regionArray[i].deactivate();
				refresh();
			}, 
			TapApp.button_delay);
	},

	loadSamples: function(n) {
		this.numSamples = n;
		this.sampleCounter = 0;
		this.samples = [];
		for(var i = 0; i < n; i++) {
			this.samples.push(new Audio(TapApp.audioDirectory + TapApp.kit + "-" + this.sampleName + TapApp.sampleSuffix));
		}
		TapApp.regionSamplesLoaded += 1;
	},

	changeSamples: function(name) {
		this.sampleName = name;
		loadSamples(TapApp.samplesPerRegion);
	},

	changeColor: function(rgb) {
	},
	deactivate: function() { 
		this.active = false; 
		//console.log("Deactivated region " + this.id); 
		refresh(); 
	}
}

var regionTreeNodeProto = {
	id: 0,
	discriminant: null,
	left:  null,
	right: null,
	region: null,
	barrier: null,

	scale: function(scaleX, scaleY) {
		if(this.region === null) {
			this.left.scale(scaleX, scaleY);
			this.right.scale(scaleX, scaleY);
		} else {
			this.region.scale(scaleX, scaleY);
		}
	}, 

	display: function(ctx) {
		if(this.region === null) {
			this.left.display(ctx);
			this.right.display(ctx);

			/* if(this.barrier !== null) {
				ctx.fillStyle = "#000";
				ctx.beginPath();
				ctx.arc(this.barrier[0], this.barrier[1], 2, 0, 2*Math.PI);
				ctx.fill();
			} */

		} else
			this.region.display(ctx);
	},

	// region array, so we can assign new patches
	// darker shades for new region created

	splitRegion: function(x, y) {
		if(this.region !== null) {
			this.left = Object.create(this);
			this.right = Object.create(this);
			this.discriminant = createDiscriminant(this.region.x, this.region.y, x, y);
			this.barrier = [ (this.region.x + x) / 2, (this.region.y + y) / 2 ];

			// In theory, I think this should either always be true or always be false
			var newRegion = Object.create(regionProto);
			newRegion.x = x;
			newRegion.y = y;
			ctx = document.getElementById("surface");
			console.log("At height " + (1-(y/surface.height)) + " and testing that this value > ");
			var i;
			for(i = 0; i < TapApp.learningStripData.length && (1-(y/surface.height) > TapApp.learningStripData[i][0]); i++)
				console.log("learningStripData[" + i + "][0] = " + TapApp.learningStripData[i][0]);	
			console.log("Need the " + i + "th learning strip");
			newRegion.color = TapApp.learningStripData[i][1];
			newRegion.sampleName = TapApp.learningStripData[i][2];
			newRegion.id = regionArray.length;
			console.log("Created new pad " + newRegion.id + " at " + newRegion.x + ", " + newRegion.y 
				+ " with color " + newRegion.color + " and sample " + newRegion.sampleName);

			regionArray.push(newRegion);

			if(this.discriminant(x,y)) {
				this.left.region	= newRegion;
				this.right.region = this.region;
				// console.log("<");
			} else {
				this.right.region = newRegion;
				this.left.region = this.region;
				// console.log(">");
			}
			this.region = null;
			return newRegion;
		}	else if (this.discriminant(x,y)) {
			return this.left.splitRegion(x,y);	
		} else {
			return this.right.splitRegion(x,y);
		}
	},

	getRegion: function(x, y) {
		if(this.region !== null)
			return this.region;
		if(this.discriminant(x,y))
			return this.left.getRegion(x,y);
		else
			return this.right.getRegion(x,y);
	},

	loadSamples: function(n) {
		if(this.region !== null) {
			this.region.samples = [];
			for(var i = 0; i < n; i++) {
				this.region.loadSamples(n);
			}
		} else {
			this.left.loadSamples(n);
			this.right.loadSamples(n);
		}	
	},

	

}

function initializeRegionTree(x, y) {
	var root = Object.create(regionTreeNodeProto);
	root.region = Object.create(regionProto);
	root.region.x = x;
	root.region.y = y;
	root.region.color = arbitraryColor();
	regionArray = [];
	regionArray.push(root.region);
	TapApp.regionTree =  root;
}

function createDiscriminant( x1,  y1,  x2,  y2) {
	var midX = (x1+x2)/2;
	var midY = (y1+y2)/2;
	var m = (y1-y2)/(x1-x2);
	var discriminant = function(x, y) {
		// console.log("Used discriminant created from pairs (" + x1 + ", " + y1 + ") and (" + x2 + ", " + y2 + ")");
		return m*(y-midY) + (x-midX) > 0;
	}
	return discriminant;
}

TapApp.loadedSamples = 0;
// Does this work?
function loadAllSamples() {
	TapApp.loadedSamples = 0;
	TapApp.regionTree.loadSamples(TapApp.samplesPerRegion);
	TapApp.accumulatedDelay = 0;
	waitForAllSamples(TapApp.sampleLoadDelay, regionArray.length);
}

function waitForAllSamples(delay, n) {
	if(TapApp.loadedSamples >= n) {
		setState(TapApp.freeplay_state);
		refresh();
	} else if(TapApp.accumulatedDelay > 100*delay) {
		console.log("Samples failed to load (waited " + (.1*delay) + (" seconds"));
	} else {
		TapApp.accumulatedDelay += delay
		setTimeout(delay, waitForAllSamples);
	}
}

function dist(x1, y1, x2, y2) {
	return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}


/////////////////
//  Recording  //
/////////////////

function startRecording() {
	TapApp.recording = [];
}

function recordHit(padNumber) {
	var d = new Date();
	var t = d.getTime();
	if(TapApp.recording === []) {
		TapApp.recordingOffset = t;
	}
	TapApp.recording.push([t, padNumber]);
}

function addRecordingOffset(offset) {
	for(hit in TapApp.recording) {
		TapApp.recording[hit][0] -= offset;
	}
}

function stopRecording() {
	addRecordingOffset(-TapApp.recordingOffset)
}

function startPlayback() {
	var d = new Date();
	TapApp.playbackPosition = 0;
	TapApp.playbackOffset = d.getTime();
	addRecordingOffset(TapApp.playbackOffset);
}

function stopPlayback() {
	addRecordingOffset(-TapApp.playbackOffset);
}

function checkForHit(playbackWindowSize) {
	if(TapApp.playbackPosition >= TapApp.recording.length) {
		TapApp.setState(TapApp.freeplay_state);
		return;
	}
	var d = new Date();
	if(d.getTime() > TapApp.recording[playbackPosition][0]) {
		TapApp.regionArray[TapApp.recording[playbackPosition][1]].play();
		TapApp.playbackPosition += 1;
	}
	setTimeout(checkForHit(playbackWindowSize), playbackWindowSize);
}

/********************
 	resize / refresh
*********************/

var resize = function() {
	var surface = document.getElementById("surface");
	var oldWidth = surface.width;
	var oldHeight = surface.height;

  surface.width = window.innerWidth;
	if(useConsole) {
  	surface.height = window.innerHeight-20;
		document.getElementById("console").height = 20;
	} else {
		surface.height = window.innerHeight;
		document.getElementById("console").height = 0;
	}

	var scaleX = surface.width / oldWidth;
	var scaleY = surface.height / oldHeight;

	if(TapApp.regionTree !== undefined)
		TapApp.regionTree.scale(scaleX, scaleY);

	// handle changing radius size

	TapApp.state_indicator_x = surface.width - 20;
	TapApp.state_indicator_y = 20; 
	
	refresh();
}

var refresh = function() {
	surface = document.getElementById("surface");
	var ctx = surface.getContext('2d');
	ctx.clearRect(0, 0, surface.width, surface.height);
	ctx.fillStyle = "#FFF";
	ctx.fillRect(0, 0, surface.width, surface.height);

	if(TapApp.regionTree !== undefined)
		TapApp.regionTree.display(ctx);


//	indicate(TapApp.app_mode, ctx);  NEXT THING TO WORK ON is transitions between states


	for(var i = 0; i < TapApp.buttonArray.length; i++) {
		TapApp.buttonArray[i].display(ctx);
	}

	indicate_state(TapApp.state, ctx, surface.width, surface.height);

}

// Indicators //

var indicate_state = function(state, ctx) {
	switch(state) {
		case TapApp.recording_state:
			ctx.fillStyle = TapApp.recordButton.afCol;
			ctx.beginPath();
			ctx.arc(TapApp.state_indicator_x, TapApp.state_indicator_y, 10, 0,2*Math.PI);
			ctx.closePath();
			ctx.fill();
			break;

		case TapApp.learning_state:
			ctx.fillStyle = TapApp.learningButton.afCol;
			ctx.beginPath();
			ctx.arc(TapApp.state_indicator_x, TapApp.state_indicator_y, 10, 0.5*Math.PI, 2*Math.PI);
			ctx.closePath();
			ctx.fill();
			break;

		case TapApp.setup_state:
			ctx.fillStyle = TapApp.setupButton.afCol;
			ctx.beginPath();
			ctx.arc(TapApp.state_indicator_x, TapApp.state_indicator_y, 10, Math.PI, 0.5*Math.PI);
			ctx.closePath();
			ctx.fill();
			break;

		case TapApp.freeplay_state:
			break;

		case TapApp.playback_state:
			ctx.fillStyle = TapApp.playButton.afCol;
			ctx.beginPath();
			ctx.arc(TapApp.state_indicator_x, TapApp.state_indicator_y, 10, Math.PI, 0.5*Math.PI);
			ctx.closePath();
			ctx.fill();
			break;

		case TapApp.loadingSamples_state:
			ctx.fillStyle = "#888"; // TapApp.loadingSamplesColor;
			ctx.strokeStyle = "#000";
			ctx.fillRect(width/2 - 40, height/2 - 20, 80, 40);
			ctx.fillStyle = "#000";
			ctx.font = "24px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Loading samples", width/2, height/2);
	
		default:
			console.log("Unknown state " + state + " was indicated");
	}
};

/**********************
	user input
**********************/
// TODO: handle tracker-style keyboard use
var handleKey = function(event) {
}

var handleTouchStart = function(event) {
	var d = new Date();
	TapApp.startTime = d.getTime();
	event.preventDefault();
	var surface = document.getElementById("surface");
	userX = touchToUserX(event, surface);
	userY = touchToUserY(event, surface);
	fauxConsole(userX + ", " + userY);
	handleXYOn(userX, userY);
}

var handleTouchMove = function(event) {
	event.preventDefault();
	var surface = document.getElementById("surface");
	userX = touchToUserX(event, surface);
	userY = touchToUserY(event, surface);
	handleXYMove(userX, userY);
}

var handleTouchEnd = function(event) {
	var surface = document.getElementById("surface");
	userX = touchToUserX(event, surface);
	userY = touchToUserY(event, surface);
	handleXYOff(userX, userY);
}

function touchToUserX(event, surface) {
	var surfaceRect = surface.getBoundingClientRect();
	return event.targetTouches[0].pageX - surfaceRect.left;
}

function touchToUserY(event, surface) {
	var surfaceRect = surface.getBoundingClientRect();
	return event.targetTouches[0].pageY - surfaceRect.top;
}



var handleMouseDown = function(event) {
	var d = new Date();
	TapApp.startTime = d.getTime();
	var surface = document.getElementById("surface");
	userX = mouseToUserX(event, surface);
	userY = mouseToUserY(event, surface);
	handleXYOn(userX, userY);
}

/*var handleMouseMove = function(event) {
	var surface = document.getElementById("surface");
	userX = mouseToUserX(event, surface);
	userY = mouseToUserY(event, surface);
	handleXYMove(userX, userY);
}

var handleMouseUp = function(event) {
	var surface = document.getElementById("surface");
	userX = mouseToUserX(event, surface);
	userY = mouseToUserY(event, surface);
	handleXYOff(userX, userY);
}*/

function mouseToUserX(event, surface) {
	var surfaceRect = surface.getBoundingClientRect();
	return event.clientX - surfaceRect.left;
}

function mouseToUserY(event, surface) {
	var surfaceRect = surface.getBoundingClientRect();
	return event.clientY - surfaceRect.top;
}



// Welcome to the action
function handleXYOn(x, y) {
	// console.log("Handling xy on at " + x + ", " + y + " and state = " + TapApp.state);
	for(var i = 0; i < TapApp.buttonArray.length; i++) {
		if(TapApp.buttonArray[i].within(x, y)) {
			TapApp.buttonArray[i].onpress();
			//fauxConsole("Pressed button " + i);
			return;
		}
	}

	if(TapApp.regionTree === undefined) {
		initializeRegionTree(x, y);
		console.log("Had to initialize tree after user input");
	}

	var region = TapApp.regionTree.getRegion(x, y);

	if(dist(x, y, region.x, region.y) < TapApp.threshold) {
		var d = new Date();
		var t = d.getTime();
		fauxConsole((t - TapApp.startTime) + ": " + TapApp.startTime + " to " + t);
		region.play();

	} else if (TapApp.state === TapApp.learning_state && dist(x, y, region.x, region.y) > TapApp.threshold) {
		region = TapApp.regionTree.splitRegion(x, y);
		setupNewPad(region)
		region.play();
	}

}

TapApp.startTime = ""

function setupNewPad(region) {
	
}

function handleXYMove(x, y) {
	// Test for buttons
	/* var region = regionTree.getRegion(x, y);
	if(region.active)
		region.deactivate();
`*/
}

function handleXYOff(x, y) {
	/* var region = regionTree.getRegion(x, y);
	if(region.active)
		region.deactivate();
	*/
}


////////////
//  main  //
////////////
// initializeRegionTree(100, 100);
initializeLearningStrips(TapApp.samplesPerRegion);
setState(TapApp.learning_state);
resize();
