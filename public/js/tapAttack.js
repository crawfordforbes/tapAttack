/* tapApp.js
	 intuitive rhythm composition */


// Next steps

// Debugging 


//set user options, start the game
var bpm = parseInt($("#bpm").val());
var measures = parseInt($("#numOfMeasures").val());
var rounds = parseInt($("#numOfRounds").val());

var playerProto = {
	name : "",
	img : undefined,
	video : undefined
};


function loadPlayerImages(img1, img2) {
	players[0].img = new Image();
	players[0].img.src = TapApp.imgDir + img1;
	players[1].img = new Image();
	players[1].img.src = TapApp.imgDir + img2;
}

var players = [{}, {}];

var startButton = $("#startGame");

var avatarImages = [ "avatar1.png", "avatar2.png" ];

startButton.click(function(){
	bpm = parseInt($("#bpm").val());
	measures = parseInt($("#numOfMeasures").val());
	rounds = parseInt($("#numOfRounds").val());

	players = [];

	var p1 = Object.create(playerProto);
	p1.name = $("#player1").val();
	p1.video = $("#player1Video").val();

	var p2 = Object.create(playerProto);
	p2.name = $("#player2").val();
	p2.video = $("#player2Video").val();

	players.push(p1);
	players.push(p2);	

	loadPlayerImages(avatarImages[0], avatarImages[1]);

	startGame();
});

/////////////////
//  Metronome  //
/////////////////


var metronomeButton = $("#metronome");
var metronomeToggle = false;
var metronome;
var snare = new Wad(Wad.presets.hiHatClosed);


function getMetronomeMilliseconds() {
	var beatsPerSecond = bpm / 60;
	var secondsPerBeat = 1 / beatsPerSecond;
    return secondsPerBeat * 1000.0;
}

function toggleMetronome() {

if (metronomeToggle === false){	
		metronome = setInterval(
			function(){
				snare.play({volume : 0.3});
			}, getMetronomeMilliseconds()
		)
		metronomeButton.text("stop metronome")
		metronomeToggle = true;
	} else {
		clearInterval(metronome);
		metronomeButton.text("start metronome");
		metronomeToggle = false;
	}
}


metronomeButton.click(function(){
	toggleMetronome();
})



function doNothing() {
}

var useConsole = false;
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
TapApp.kit = "baindus";
TapApp.kits= ["808", "ba", "baindus"];
TapApp.recording = [];

TapApp.imgDir = "png/";

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

TapApp.gameStarted = false;
TapApp.gameOver = false;

TapApp.backgroundLoaded = false;

TapApp.turnSwitchDisplay = "";

//////////////////////
//  Gameplay State  //
//////////////////////

TapApp.roundNumber = 0;
TapApp.currentPlayer = 0;
TapApp.round = null;
TapApp.roundResult = [];
TapApp.currentRoundResult = null;
TapApp.isSwitchingPlayer = false;

var noteProto = {
   region : undefined,
   time : undefined
};

var roundResultProto = {
   player : undefined,
   round : undefined,
   notes : []
}

var roundProto = {
   startTime : undefined
   //todo: more data?
   //this is in its own object, for easier reasoning about
};

///////////////////////////////
//  Gameplay Playback State  //
///////////////////////////////

TapApp.playbackIndex = 0;
TapApp.playbackStartTime = 0;
TapApp.playbackNoteIndex = 0;

/////////////////
//  Constants  // 
/////////////////

TapApp.playerCount = 2; //TODO: more than two.

TapApp.button_delay = 100;

TapApp.threshold = 70;  //  larger than the radius to be nice, we don't want to accidentally make a new one or miss a tap
TapApp.thresholdSquared = TapApp.threshold * TapApp.threshold;

TapApp.r1 = 40;	// radius used to designate "center" of region
TapApp.r2 = 60;

TapApp.backgroundImage = null;

// TapApp.audioDirectory = "../mp3/";
TapApp.audioDirectory = "mp3/";
TapApp.patches = ["hightom", "hi_conga", "kick1", "kick2", "maracas", "open_hh", "rimshot", "snare", "tom1" ];
TapApp.sampleSuffix = ".mp3";
TapApp.samplesPerRegion = 12;
TapApp.sampleLoadDelay = 100;

// Maybe convert these to objects later
TapApp.learningStripData = [
		[.3, "#F00", "taa", 0], 
		[.6, "#F80", "taah", 0],
		[.8, "#0D0", "toh", 0], 
		[ 1, "#00F", "tosh", 0]
];

TapApp.sampleBank = [
	["808", [ "hi_conga", "kick1", "snare", "hightom" ]],
	["baindus", [ 
		"tosh",
		"tosh",
		"tosh",
		"snop",
		"snop",
		"taa",
		"taa",
		"taa",
		"snap", 	
		"taah", 
		"taa", 
		"snop", 
		"tosh", 
		"ting", 
		"toh",
		"ting"
	 ]
	]
];


TapApp.patchHash = {
	"hi tom": "hightom", 
	"kick": "kick",
	"open hat": "open_hh",
	"rimshot": "rimshot",
	"snare": "snare",
	"tom": "tom1"
};

TapApp.playbackRate = 10;  // how long the callback waits before calling itself again 
													 // to see if there's a new note to play

////////////// 
//  Colors  //
////////////// 
var hexDigits = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' ];
function toHex(i) { return hexDigits[Math.floor(i/16)] + hexDigits[i%16]; }

function rgb(red, green, blue) { return "#" 
		+ toHex(Math.floor(red)) 
		+ toHex(Math.floor(green)) 
		+ toHex(Math.floor(blue)); }

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
/*
TapApp.learningButton = Object.create(buttonProto);
TapApp.learningButton.init(10, 10, 40, 40, "#EE0", "#FF0");
TapApp.learningButton.onpress = function() {
	setState(TapApp.learning_state);
	TapApp.regionSet = undefined;
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
	console.log("ms to play - " + getPlayMilliseconds());
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
	for(var s in TapApp.recording) {
		console.log("At time " + TapApp.recording[s][0] + " play " + TapApp.recording[s][1]);
	}
};
*/
function setState(newState) {
	// console.log("Setting state from " + TapApp.state + " to " + newState);

	// learning -> non-learning: load samples
	if(newState !== TapApp.learning_state && TapApp.state === TapApp.learning_state) {
		loadAllSamples();

	// start recording
	} else if(newState === TapApp.recording_state) {
		startRecording();

	// stop recording
	} else if(TapApp.state === TapApp.recording_state) {
		stopRecording();

	// stop playback
	} else if(TapApp.state === TapApp.playback_state) {
		console.log("Switched out of playback state, stopping playback");
		// stopPlayback(); // currently doesn't do anything anyway
	}

	// start playback
	if(newState === TapApp.playback_state) {
		var d = new Date();
		console.log("Switched state to playback state at time " + d.getTime() + ", starting playback");
		//startPlayback();
	// stop playback
	} 
	/*
	for(var i = 0; i < TapApp.stateButtonArray.length; i++) {
		if(i === newState) {
			TapApp.stateButtonArray[i].active = true;
		} else {
			TapApp.stateButtonArray[i].active = false;
		}
	}
	*/
	TapApp.state = newState;
	refresh();
};


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
			console.log(TapApp.audioDirectory + TapApp.kit + "-" + TapApp.learningStripData[strip][2] + TapApp.sampleSuffix);			
			TapApp.learningStripSamples[strip].push(
				new Audio( TapApp.audioDirectory + TapApp.kit + "-" + TapApp.learningStripData[strip][2] + TapApp.sampleSuffix)
			);
		}
	}
}

function playStripSample(i) {
	// console.log("Playing the " + TapApp.learningStripData[i][3] + "th copy (out of " + TapApp.learningStripSamples[i].length + " of learning strip sample " + i);
	TapApp.learningStripSamples[i][TapApp.learningStripData[i][3]].play();
	TapApp.learningStripData[i][3] = (TapApp.learningStripData[i][3] + 1) % TapApp.learningStripSamples[i].length;
}

function getStrip(y) {
	for(i = 0; i < TapApp.learningStripData.length && (1-(y/surface.height) > TapApp.learningStripData[i][0]); i++)
		;
	// console.log("Need the " + i + "th learning strip");
	return i;
}

///////////////
//  Regions  //
///////////////
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

	setPosition: function(x,y) {
		this.x = x;
		this.y = y;
	},

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
		// console.log("Playing region " + this.id + " during state " + TapApp.state);
		this.active = true;
		refresh();
		// console.log("Need to play sample " + this.sampleCounter + " of " + this.samples.length);
		if(TapApp.state === TapApp.learning_state) {
			var stripNum = getStrip(this.y);
			playStripSample(stripNum);
		} else {
			// console.log("Playing copy " + this.sampleCounter);
			this.samples[this.sampleCounter].play();
			this.sampleCounter = (this.sampleCounter + 1) % this.numSamples;
		}
		var i = this.id;
		setTimeout( 
			function() { 
				TapApp.regionSet.deactivateRegion(i);
				refresh();
			}, 
			TapApp.button_delay);
	},

	record: function() {
		recordHit(this.id);
	},

    distanceSquared : function(x, y) {
	    var deltaX = x - this.x;
        var deltaY = y - this.y;
        return deltaX * deltaX + deltaY * deltaY;
    },

	clicked: function(x, y) {
       return this.distanceSquared(x,y) < TapApp.thresholdSquared;
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
		refresh(); 
	}
}
 
var regionSetProto = {
	regionArray : [],
     
     
     deactivateRegion : function(id) {
 	 	this.regionArray[id].deactivate();
     },

	display : function(ctx) {
		for (var i in this.regionArray) {
			this.regionArray[i].display(ctx);
		}
	},
     

	clicked : function(x,y) {
	   for (var i in this.regionArray) {
	      if (this.regionArray[i].clicked(x,y)) {
	         return this.regionArray[i];
	      }
	   }
       return null;
	},


	addTypedRegion : function(x,y, color, sampleName){

		var newRegion = Object.create(regionProto);
		newRegion.x = x;
		newRegion.y = y;
		ctx = document.getElementById("surface");
		newRegion.color = color;
		newRegion.sampleName = sampleName ;
		newRegion.id = this.regionArray.length;
		//console.log("Created new pad " + newRegion.id + " at " + newRegion.x + ", " + newRegion.y 
			//+ " with color " + newRegion.color + " and sample " + newRegion.sampleName);

		this.regionArray.push(newRegion);		

		return newRegion;
	},

	addRegion : function(x,y){
		console.log("At height " + (1-(y/surface.height)) + " and testing that this value > ");
		var i;
		for(i = 0; i < TapApp.learningStripData.length && (1-(y/surface.height) > TapApp.learningStripData[i][0]); i++)
			console.log("learningStripData[" + i + "][0] = " + TapApp.learningStripData[i][0]);	
		console.log("Need the " + i + "th learning strip");

		return this.addTypedRegion(x, y, TapApp.learningStripData[i][1], TapApp.learningStripData[i][2]);
	},

	loadSamples: function(n) {
		for (var region in this.regionArray) {
			this.regionArray[region].samples = [];
			this.regionArray[region].loadSamples(n);
		}
	}
}



TapApp.loadedSamples = 0;
// Does this work?
function loadAllSamples() {
	TapApp.loadedSamples = 0;
	TapApp.regionSet.loadSamples(TapApp.samplesPerRegion);
	TapApp.accumulatedDelay = 0;
	waitForAllSamples(TapApp.sampleLoadDelay, TapApp.regionSet.regionArray.length);
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

function ensureRegionSet(){
	if (TapApp.regionSet === undefined) {
		TapApp.regionSet = Object.create(regionSetProto);
	}
}


function scaleDefaultPads() {
	//todo:  assumes 4 pads.  should be more generic.

	 var surface = document.getElementById("surface");
	 var width = surface.width;
	 var height = surface.height;

	 var midy = height/2;
	 var xsep = width/4;
	 var x1 = width/8;
	 var x2 = (width*7)/8;
	 var numPads = 8;
	 var x = x1;

	 for(var i = 0; i < numPads; i++) {
		 if(i < numPads/2)
		 	 x = x1+i*(x2-x1-xsep)/2/(numPads/2-1)
		 else
		 	 x = x2-(numPads-1-i)*(x2-x1-xsep)/2/(numPads/2-1)
		 TapApp.regionSet.regionArray[i].setPosition(x,midy);
	 }

}

function createDefaultPads() {
	 ensureRegionSet();
	 var colors = [
		"#00F",
		"#00F",
		"#00F",
		"#F60",
		"#F60",
		"#080",
		"#080",
		"#080",
	 ];

	 var surface = document.getElementById("surface");
	 var width = surface.width;
	 var height = surface.height;

	 var midy = height/2;
	 var xsep = width/4;
	 var x1 = width/8;
	 var x2 = (width*7)/8;
	 var numPads = 8;
	 var x = x1;

	 for(var i = 0; i < numPads; i++) {
		 if(i < numPads/2)
		 	 x = x1+i*(x2-x1-xsep)/(numPads/2-1)
		 else
		 	 x = x2-(numPads-1-i)*(x2-x1-xsep)/(numPads/2-1)
		 TapApp.regionSet.addTypedRegion(x,midy,
				colors[i],
				TapApp.sampleBank[1][1][i]
		 );
	 }
}





/////////////////
//  Recording  //
/////////////////


function getPlayMilliseconds() {
	var beatsPerSecond = bpm / 60;
	var secondsPerBeat = 1 / beatsPerSecond;

	//time is 4/4

	var beats = 4 * measures;

    return beats * secondsPerBeat * 1000.0;
}

function startRecording() {
	TapApp.recording = [];
}

function recordHit(padNumber) {
	var d = new Date();
	var t = d.getTime();
	if(TapApp.recording.length === 0) {
		TapApp.recordingOffset = t;
	}
	console.log("Recorded pad " + padNumber + " at time " + t);
	TapApp.recording.push([t, padNumber]);
	var n = TapApp.recording.length-1;
	console.log("To be clear, we just recorded pad " + TapApp.recording[n][1] 
						+ " at time " + TapApp.recording[n][0]);
	for(var s in TapApp.recording) {
		console.log("  " + TapApp.recording[s][0] + ", " + TapApp.recording[s][1]);
	}
}

function addRecordingOffset(offset) {
	for(hit in TapApp.recording) {
		TapApp.recording[hit][0] += offset;
	}
}

function stopRecording() {
	addRecordingOffset(-TapApp.recordingOffset)
}

function returnPlaybackCallback(time, padNumber) {
	var region = TapApp.regionSet.regionArray[padNumber]
	return function() { 
		console.log("It has been " + time + " seconds, playing sample " + padNumber);
		region.play();
	}
}

function startPlayback() {
	for(var i in TapApp.recording) {
		var time = TapApp.recording[i][0];
		var padNumber = TapApp.recording[i][1];
		console.log("Setting timeout in " + time + "ms to play sample " + padNumber);
		setTimeout( returnPlaybackCallback(time, padNumber), time);
	}
	var last = TapApp.recording.length-1;

	// 100ms after the last sample is played, switch to freeplay mode
	setTimeout(function() { setState(TapApp.freeplay_state) }, TapApp.recording[last][0]+100);
}

function determineDateDelay() {
	var d1 = new Date();
	var d2 = new Date();
	console.log("btw, new Date generation delay: " + (d2.getTime() - d1.getTime()));
}

/*
function toPlayOrNotToPlay() {
	if(TapApp.playbackPosition >= TapApp.recording.length) {
		setState(TapApp.freeplay_state);
		return;
	}
	var d = new Date();
	if(d.getTime() > TapApp.recording[TapApp.playbackPosition][0]) {
		TapApp.regionArray[TapApp.recording[TapApp.playbackPosition][1]].play();
		TapApp.playbackPosition += 1;
	}
	setTimeout(toPlayOrNotToPlay(), TapApp.playbackRate);
}
*/

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

    scaleDefaultPads();

	// handle changing radius size

	TapApp.state_indicator_x = surface.width - 20;
	TapApp.state_indicator_y = 20; 
	
	refresh();
}

function displayGame(ctx) {

	if(TapApp.regionSet !== undefined)
		TapApp.regionSet.display(ctx);

	displayAvatar(players[TapApp.currentPlayer], ctx);

//	indicate(TapApp.app_mode, ctx);  NEXT THING TO WORK ON is transitions between states

/*
	for(var i = 0; i < TapApp.buttonArray.length; i++) {
		TapApp.buttonArray[i].display(ctx);
	}
*/

	indicate_state(TapApp.state, ctx, surface.width, surface.height);	
}

function displayAvatar(player, ctx) {
	var padding = 10;
	var shadow = 4;
	var imgSize = 64;
	var textSize = imgSize * 3/4;
	var spacing = imgSize / 4;
	ctx.drawImage(player.img, padding, padding, imgSize, imgSize);
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = textSize + "px Arial";
	ctx.fillStyle = "#000";
	ctx.fillText(player.name, padding + shadow + imgSize + spacing, imgSize/2 + padding + shadow);		
	ctx.fillStyle = "#FFF";
	ctx.fillText(player.name, padding + imgSize + spacing, imgSize/2 + padding );		
}

function displaySplash(ctx) {
	ctx.globalAlpha = 1;		// opacity of text, might have been messed up before?
	ctx.fillStyle = "#000";
	ctx.font = "64px Arial";
	ctx.textAlign = "center";
	ctx.fillText("TAP BATTLE", surface.width/2, surface.height/2);		
	ctx.fillStyle = "#EEE";
	ctx.fillText("TAP BATTLE", surface.width/2-4, surface.height/2-4);			
}

var refresh = function() {
	surface = document.getElementById("surface");
	var ctx = surface.getContext('2d');
	ctx.clearRect(0, 0, surface.width, surface.height);
	ctx.fillStyle = "#FFF";
	ctx.fillRect(0, 0, surface.width, surface.height);

	if (TapApp.backgroundLoaded)
	{
		ctx.drawImage(TapApp.backgroundImage, 0,0, surface.width, surface.height);
	}


	if (!TapApp.gameStarted) {
		displaySplash(ctx);
	} else {
		displayGame(ctx);	
	}
}

// Indicators //

function displayCountdownText(ctx, text) {
	var rectX = surface.width/4;
	var rectY = surface.height/4;
	var rectW = surface.width/2;
	var rectH = surface.height/2;
	ctx.globalAlpha = 0.8;
	ctx.fillStyle = "#999";
	ctx.strokeStyle = "#000";
	ctx.fillRect(rectX, rectY, rectW, rectH);
	ctx.globalAlpha = 1;
	ctx.strokeRect(rectX, rectY, rectW, rectH);
	ctx.fillStyle = "#FFF";
	ctx.font = "64px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#000";
	ctx.fillText(text, surface.width/2, surface.height/2);		
	ctx.fillStyle = "#EEE";
	ctx.fillText(text, surface.width/2-4, surface.height/2-4);		
}

var indicate_state = function(state, ctx) {

	if (!canTap())
	{	
		displayCountdownText(ctx, TapApp.turnSwitchDisplay);
	}

	/*switch(state) {
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
			break;
	
		default:
			console.log("Unknown state " + state + " was indicated");
	}*/
};



//returns false if done playing....
function canTap()
{
	return !TapApp.isSwitchingPlayer;
}

function playNextNote()
{
	var roundResult = TapApp.roundResult[TapApp.playbackIndex];
	var note = roundResult.notes[TapApp.playbackNoteIndex];
	playRegion(TapApp.regionSet.regionArray[note.region]);
	++TapApp.playbackNoteIndex;

	var waitTime = 1000;
	if (TapApp.playbackNoteIndex === roundResult.notes.length)
	{
		//TODO: FILL ME IN HERE
		//notify UI, this round is done?
		return false;
	}
	else
	{
		var nextNote = roundResult.notes[TapApp.playbackNoteIndex];
		waitTime = nextNote.time - note.time;
		setTimeout(function() {
			playNextNote();
		}, waitTime);		
		return true;
	}
}

function playbackRound(round, player)
{
	var d = new Date();

	TapApp.playbackStartTime = d.getTime();
	TapApp.playbackNoteIndex = 0;	

	for (var i in TapApp.roundResult)
	{
		var roundResult = TapApp.roundResult[i];
		if (roundResult.player === player && roundResult.round === round)
		{
			TapApp.playbackIndex = i;
			playNextNote();
		}
		//else error?
	}
}

function runGameplayPlayback()
{
	playbackRound(0,1);
}

function incrementRound()
{
	if (TapApp.currentRoundResult !== null)
	{
		TapApp.roundResult.push(TapApp.currentRoundResult);
	}

	++TapApp.currentPlayer;
	if (TapApp.currentPlayer === TapApp.playerCount)
	{
		TapApp.currentPlayer = 0;	
		++TapApp.roundNumber;
		console.log("End of round!!");				
		if (TapApp.roundNumber === rounds)
		{

			if (metronomeToggle) {
				toggleMetronome();	
			}

			TapApp.gameOver = true;
			votingModal();
			//HACK HACK HACK
			setState(TapApp.playback_state);
			//runGameplayPlayback();
			return;
		}		
	}	
	TapApp.isSwitchingPlayer = true;
	TapApp.turnSwitchDisplay = players[TapApp.currentPlayer].name + "'s turn!";

	var waitBeat =  getMetronomeMilliseconds();
	var waitLen = waitBeat * 8;
	var waitPlayer = waitBeat * 4;
	
	setTimeout(function() {
		TapApp.isSwitchingPlayer = false;

		refresh();
	}, waitLen);

	setTimeout(function() {
		TapApp.turnSwitchDisplay = "4";

		refresh();
	}, waitPlayer);

	setTimeout(function() {
		TapApp.turnSwitchDisplay = "3";
		
		refresh();
	}, waitPlayer + waitBeat);	

	setTimeout(function() {
		TapApp.turnSwitchDisplay = "Ready?";
		
		refresh();
	}, waitPlayer + waitBeat * 2);		

	setTimeout(function() {
		TapApp.turnSwitchDisplay = "TAP!";
		
		refresh();
	}, waitPlayer + waitBeat * 3);		
}

function nextRound()
{
	TapApp.currentRoundResult = Object.create(roundProto);

	TapApp.currentRoundResult.player = TapApp.currentPlayer;
	TapApp.currentRoundResult.round = TapApp.roundNumber;
	TapApp.currentRoundResult.notes = [];

	console.log(players[TapApp.currentPlayer].name + "'s turn!");		

	refresh();

	startRound();
}

//todo: give this a better home
function playRegionGameplayUpdate(region)
{
    if (TapApp.round)
    {
    	if (TapApp.round.startTime === undefined)
    	{
    		var d = new Date();
			TapApp.round.startTime  = d.getTime();	
			setTimeout(
				function() {
					incrementRound();
					nextRound();
				}, getPlayMilliseconds());
    	}


	    if (TapApp.currentRoundResult)
	    {
	    	var note = Object.create(noteProto);
	    	note.region = region.id;
	    	var d = new Date();
	    	note.time = d.getTime() - TapApp.round.startTime;
	    	TapApp.currentRoundResult.notes.push(note);
	    }    	
    }	
}

function playRegion(region)
{
	if(TapApp.state === TapApp.recording_state)
		region.record();

	if (TapApp.state === TapApp.freeplay_state)
	{
		playRegionGameplayUpdate(region);
	}

	region.play();	
}
/**********************
	user input
**********************/
// TODO: handle tracker-style keyboard use


//set default keys
var keyLookup = [];
keyLookup[65] = 0;
keyLookup[83] = 1;
keyLookup[68] = 2;
keyLookup[70] = 3;
keyLookup[74] = 4;
keyLookup[75] = 5;
keyLookup[76] = 6;
keyLookup[59] = 7;
keyLookup[186] = 7;

var handleKey = function(event) {
	if (event.repeat !== undefined)
	{
		if (event.repeat) return;
	}
		// console.log("Pressed key " + event.keyCode);

    if (keyLookup[event.keyCode] !== undefined)
    {
    	if (!canTap()) return; //we're switching rounds or something.... disable tapping!
    	if (TapApp.gameOver) return;
    	if (!TapApp.gameStarted) return;
    	var regionIndex = keyLookup[event.keyCode];
    	var region = TapApp.regionSet.regionArray[regionIndex];
    	playRegion(region);
    }
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

	ensureRegionSet();

	var region = TapApp.regionSet.clicked(x, y);

	if(region !== null) {
		var d = new Date();
		var t = d.getTime();
		//fauxConsole((t - TapApp.startTime) + ": " + TapApp.startTime + " to " + t);
		//playRegion(region);

	} else if (TapApp.state === TapApp.learning_state) {
		region = TapApp.regionSet.addRegion(x, y);
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


function startRound() {
	TapApp.round = Object.create(roundProto);

	$(".currentPlayer").text(players[TapApp.currentPlayer].name)
}

function startGame()
{
	TapApp.gameStarted = true;
	TapApp.roundNumber = 0;
	TapApp.currentPlayer = 0;
	toggleMetronome();
	nextRound();
}


function votingModal() {

	var modalString = '<div id="votingModal" class="modal fade" tabindex="-1" role="dialog"><div class="modal-dialog"><div class="modal-content"><h2 style="text-align: center;">VOTING</h2><ul style="list-style: none;">'
	for(var i = 0; i < rounds; i++){
		var x = i + 1;
		modalString += '<li><h3>ROUND ' + x + '</h3><ul style="list-style: none;"><li>		<p>' + players[0].name + ': </p>		<button class="playFinal" id="player0round' + i + '" onclick="playbackRound(' + i + ', 0)">play</button><input style="margin-left: 10px;" type="radio" id="votePlayer0Round' + i + '" value="0" name="votePlayer0Round' + i + '">	</li>	<li>		<p>' + players[1].name + ': </p>		<button class="playFinal" id="player1round' + i + '" onclick="playbackRound(' + i + ', 1)">play</button><input style="margin-left: 10px;" type="radio" id="votePlayer1Round' + i + '" value="1" name="votePlayer1Round' + i + '"/>	</li></ul></li>'

	}
	modalString += '</ul><button id="submitVotes" onclick="chooseWinner()">Submit</button></div></div></div>'


	$('#votingContainer').html(modalString);
	$('#votingModal').modal();
    return false;

}
function chooseWinner() {
	var p1score = 0;
	var p2score = 0;
	for(var i = 0; i < rounds; i++){

		if($('input[name=votePlayer0Round' + i + ']:checked').val()){

			p1score++
		} else if($('input[name=votePlayer1Round' + i + ']:checked').val()){

			p2score++
		} else {
			alert("please vote on all rounds");
			return
		}
	}
	if(p1score > p2score){
		showWinner(1)
	} else {
		showWinner(2)
	}
}

function showWinner(id){
	$('#votingModal').modal('toggle');
	var name = $("#player" + id).val();
	var ytube = $("#player" + id + "Video").val();
	var url = ytube.split("/")[3];

	document.body.innerHTML ='<h2 style="text-align: center;">CONGRATULATIONS ' + name +'</h2><iframe style="margin: 20px auto 20px auto;" width="560" height="315" src="https://www.youtube.com/embed/' + url + '" frameborder="0" allowfullscreen></iframe><br /><button style="margin: auto;" onclick="restart()">Play again</button>'

	
}
function restart(){
	window.location.reload();
}


function loadBackgroundImage() {

	TapApp.backgroundImage =  new Image();

    TapApp.backgroundImage.onload = function() {
    	TapApp.backgroundLoaded = true;    
    	refresh();
    };
    TapApp.backgroundImage.src = 'png/bg-checkerboard.png';
}

////////////
//  main  //
////////////
loadBackgroundImage();
initializeLearningStrips(TapApp.samplesPerRegion);
setState(TapApp.learning_state);
createDefaultPads();
setState(TapApp.freeplay_state);
resize();
 

