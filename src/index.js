
/**
 *
 * @module TINA
 *
 * @author Brice Chevalier
 *
 * @desc 
 *
 * Tweening and INterpolations for Animation
 * 
 * Animation library to easily create and customisable tweens,
 * timelines, sequences and other playable components.
 *
 * Note: if you want a particular component to be added
 * create an issue or contribute at https://github.com/Wizcorp/tina
 */

// Method to trigger automatic update of TINA
var requestAnimFrame = (function(){
	return window.requestAnimationFrame    || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function(callback){
			window.setTimeout(callback, 1000 / 60);
		};
})();

// Performance.now gives better precision than Date.now
var clock = window.performance || Date;

var TINA = {
	Tweener:       require('./Tweener'),
	Timer:         require('./Timer'),
	Ticker:        require('./Ticker'),
	Playable:      require('./Playable'),
	Player:        require('./Player'),
	// Controller:    require('./Controller'), // TODO
	Tween:         require('./Tween'),
	// Warning: Using relative tweens can lead to rounding errors (very small).
	TweenRelative: require('./TweenRelative'),
	Timeline:      require('./Timeline'),
	Sequence:      require('./Sequence'),
	Recorder:      require('./Recorder'),
	Delay:         require('./Delay'),
	easing:        require('./easing'),
	interpolation: require('./interpolation'),

	_tweeners: [],
	_defaultTweener: null,
	_running: false,

	_startTime: 0,
	_time: 0,

	// callbacks
	_onStart:  null,
	_onPause:  null,
	_onResume: null,
	_onUpdate: null,
	_onStop:   null,

	onStart: function (onStart) {
		this._onStart = onStart;
		return this;
	},

	onUpdate: function (onUpdate) {
		this._onUpdate = onUpdate;
		return this;
	},

	onStop: function (onStop) {
		this._onStop = onStop;
		return this;
	},

	onPause: function (onPause) {
		this._onPause = onPause;
		return this;
	},

	isRunning: function () {
		return this._running;
	},

	update: function () {
		var now = clock.now() - this._startTime;
		var dt = now - this._time;
		if (dt < 0) {
			// Clock error, ignoring this update
			// Date.now is based on a clock that is resynchronized
			// every 15-20 mins and could cause the timer to go backward in time.
			// (legend or reality? not sure, but I think I noticed it once)
			// To get some explanation from Paul Irish:
			// http://updates.html5rocks.com/2012/08/When-milliseconds-are-not-enough-performance-now
			return;
		}

		this._time = now;

		// Making a copy of the tweener array
		// to avoid funky stuff happening
		// due to addition or removal of tweeners
		// while iterating them
		var runningTweeners = this._tweeners.slice(0);
		for (var t = 0; t < runningTweeners.length; t += 1) {
			runningTweeners[t]._moveTo(this._time, dt);
		}

		if (this._onUpdate !== null) {
			this._onUpdate(this._time, dt);
		}
	},

	start: function () {
		if (this._running === true) {
			console.warn('[TINA.start] TINA is already running');
			return this;
		}

		var self = this;
		var selfUpdate = function () {
			if (self._running === true) {
				self.update();
				requestAnimFrame(selfUpdate);
			}
		}

		if (this._onStart !== null) {
			this._onStart();
		}

		// Setting the clock
		this._startTime = clock.now();
		this._time = 0;

		for (var t = 0; t < this._tweeners.length; t += 1) {
			this._tweeners[t]._start();
		}

		this._running = true;

		// Starting the animation loop
		requestAnimFrame(selfUpdate);
		return this;
	},

	pause: function () {
		if (this._running === false) {
			console.warn('[TINA.pause] TINA is not running');
			return this;
		}

		this._running = false;
		for (var t = 0; t < this._tweeners.length; t += 1) {
			this._tweeners[t]._pause();
		}

		if (this._onPause !== null) {
			this._onPause();
		}
		return this;
	},

	resume: function () {
		if (this._running === true) {
			console.warn('[TINA.resume] TINA is already running');
			return this;
		}

		this._running = true;
		if (this._onResume !== null) {
			this._onResume();
		}

		for (var t = 0; t < this._tweeners.length; t += 1) {
			this._tweeners[t]._resume();
		}

		// Resetting the clock
		// Getting time difference between last update and now
		var now = clock.now();
		var dt = now - this._time;

		// Moving starting time by this difference
		// As if the time had virtually not moved
		this._startTime += dt;

		return this;
	},

	stop: function () {
		this._running = false;
		var runningTweeners = this._tweeners.slice(0);
		for (var t = 0; t < runningTweeners.length; t += 1) {
			runningTweeners[t]._stop();
		}

		if (this._onStop !== null) {
			this._onStop();
		}
		return this;
	},

	setDefaultTweener: function (tweener) {
		this._defaultTweener = tweener;
	},

	getDefaultTweener: function () {
		return this._defaultTweener;
	},

	_add: function (tweener) {
		// A tweener is starting
		if (this._running === false) {
			// TINA is not running, starting now
			this.start();
		}

		this._tweeners.push(tweener);
	},

	add: function (tweener) {
		this._tweeners.push(tweener);
		return this;
	},

	_remove: function (tweener) {
		var tweenerIdx = this._tweeners.indexOf(tweener);
		if (tweenerIdx !== -1) {
			this._tweeners.splice(tweenerIdx, 1);
		}
	},

	remove: function (tweener) {
		this._remove(tweener);
		return this;
	},

	_getDefaultTweener: function () {
		if (this._defaultTweener === null) {
			var DefaultTweener = this.Timer;
			this._defaultTweener = new DefaultTweener().start();
		} else {
			// Is the default tweener running?
			var idx = this._tweeners.indexOf(this._defaultTweener);
			if (idx === -1) {
				// Not running, starting it
				this._defaultTweener.start();
			}
		}

		return this._defaultTweener;
	}
};


// To handle lost of focus of the page
// Constants to manage lost of focus of the page
var hidden, visbilityChange; 
if (typeof document.hidden !== 'undefined') {
	// Recent browser support 
	hidden = 'hidden';
	visbilityChange = 'visibilitychange';
} else if (typeof document.mozHidden !== 'undefined') {
	hidden = 'mozHidden';
	visbilityChange = 'mozvisibilitychange';
} else if (typeof document.msHidden !== 'undefined') {
	hidden = 'msHidden';
	visbilityChange = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
	hidden = 'webkitHidden';
	visbilityChange = 'webkitvisibilitychange';
}

if (typeof document[hidden] === 'undefined') {
	this._warn('[Tweener] Cannot pause on lost focus because the browser does not support the Page Visibility API');
} else {
	// Handle page visibility change
	var wasRunning = false;
	document.addEventListener(visbilityChange, function () {
		if (document[hidden]) {
			// document is hiding
			wasRunning = TINA.isRunning();
			if (wasRunning) {
				TINA.pause();
			}
		}

		if (!document[hidden]) {
			// document is back (we missed you buddy)
			if (wasRunning) {
				// Running TINA only if it was running when the document focus was lost
				TINA.resume();
			}
		}
	}, false);
}

(function (root) {
	// Global variable
	root.TINA = TINA;
})(this);

module.exports = TINA;
