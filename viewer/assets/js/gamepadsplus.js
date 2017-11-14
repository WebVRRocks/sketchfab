/* global define, module */
(function () {
  var DEFAULTS = {
    autostart: true,
    buttonThreshold: 0.1,
    emitEventsOnWindow: true,
    postMessageEventsOn: null,
    mappings: {
      'Oculus Remote': {
        'b0': 'center',
        'b1': 'back',
        'b2': 'up',
        'b3': 'down',
        'b5': 'right',
        'b4': 'left'
      },
      'OpenVR Gamepad': {
        'b3': 'menu'
      }
    }
  };

  function slugify (str) {
    return (str || '').toLowerCase().replace(/[^\w]/g, '').replace(/\(.+\)/, '');
  }

  function formatEvent (name, detail) {
    var event = new CustomEvent(name, {detail: detail});
    Object.keys(detail).forEach(function (key) {
      event[key] = detail[key];
    });
    return event;
  }

  function Gamepads (settings) {
    var self = this;
    this.supported = window.requestAnimationFrame && navigator.getGamepads;

    if (typeof settings === 'string') {
      this.settings = {select: settings};
    } else {
      this.settings = settings || {};
    }

    this.start = function () {
      if (this.started) {
        return;
      }
      this.started = true;
      if (navigator.getGamepads()[0]) {
        startLoop();
      } else {
        window.addEventListener('gamepadconnected', startLoop);
      }
    };

    this.stop = function () {
      window.removeEventListener('gamepadconnected', startLoop);
      window.cancelAnimationFrame(this.raf);
    };

    this.DEFAULTS = DEFAULTS;

    if (this.supported) {
      this.settings.mappings = Object.assign({}, DEFAULTS.mappings, this.settings.mappings);
      this.settings = Object.assign({}, DEFAULTS, this.settings);

      this.state = {};
      this.previousState = {};

      this.start();

      // In Chromium builds, you must first query the VR devices for Gamepads to be exposed.
      if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then(function () {
          if (!self.autostarted && self.settings.autostart) {
            self.autostarted = true;
            self.start();
          }
        });
      }

      if (!this.autostarted && this.settings.autostart) {
        this.autostarted = true;
        this.start();
      }

      window.addEventListener('vrdisplaypresentchange', function () {
        if (!self.settings.autostart && self.autostarted) {
          self.autostarted = true;
          if (self.started) {
            self.stop();
          } else {
            self.start();
          }
        }
      });
    }

    function loop () {
      self.poll();
      self.raf = window.requestAnimationFrame(loop);
    }

    function startLoop () {
      self.raf = window.requestAnimationFrame(loop);
      window.removeEventListener('gamepadconnected', startLoop);
    }
  }

  Gamepads.prototype.poll = function () {
    var self = this;
    if (!this.supported) { return; }
    this.gamepads = navigator.getGamepads();
    var gp;
    var btn;
    var btnState;
    var len;
    var previousBtnState;

    for (var i = 0; i < navigator.getGamepads().length; ++i) {
      gp = navigator.getGamepads()[i];
      if (!gp) { continue; }
      if (this.select && this.select !== gp.id) { continue; }
      this.state[gp.id] = {};
      if (!this.previousState[gp.id]) {
        this.previousState[gp.id] = {};
      }
      if (gp.buttons) {
        len = gp.buttons.length;
        for (var j = 0; j < len; ++j) {
          btn = gp.buttons[j];

          previousBtnState = this.previousState[gp.id]['b' + j] = this.previousState[gp.id]['b' + j] || {
            gamepad: {
              index: i,
              id: gp.id
            },
            button: {
              index: j,
              value: 0,
              pressed: false,
              name: this.buttonName(gp, j),
              count: 0
            }
          };

          btnState = this.state[gp.id]['b' + j] = {
            gamepad: {
              index: gp.index,
              id: gp.id
            },
            button: {
              index: j,
              value: this.buttonValue(btn),
              pressed: this.buttonPressed(btn),
              name: this.buttonName(gp, j),
              count: previousBtnState.button.count
            }
          };

          if (previousBtnState.button.value !== btnState.button.value) {
            emitEvent(['gamepad.buttonvaluechange', btnState]);
          }

          if (previousBtnState.button.pressed && btnState.button.pressed) {
            this.state[gp.id]['b' + j].button.count++;
            if (this.state[gp.id]['b' + j].button.count >= 50) {
              emitEvent(['gamepad.buttonhold', btnState]);
              this.state[gp.id]['b' + j].button.count = 0;
            }
          }

          if (!previousBtnState.button.pressed && btnState.button.pressed) {
            this.state[gp.id]['b' + j].button.count = 0;
            emitEvent(['gamepad.buttondown', btnState]);
          }

          if (previousBtnState.button.pressed && !btnState.button.pressed) {
            emitEvent(['gamepad.buttonup', btnState]);
            this.state[gp.id]['b' + j].button.count = 0;
          }
        }
      }
    }

    function emitEvent (eventToEmit) {
      var name = eventToEmit[0];
      var detail = Object.assign({}, eventToEmit[1]);

      if (detail.button && detail.button.count) {
        // TODO: Actually store timestamps and compare.
        detail.button.seconds = Math.ceil(detail.button.count / 30);
      }

      // Emit `gamepad.buttondown`, for example.
      self.emit(formatEvent(name, detail));

      name += '.' + self.gamepadSlug(detail.gamepad);

      // Emit `gamepad.buttondown.oculusremote`, for example.
      self.emit(formatEvent(name, detail));

      if (detail.button) {
        // Emit `gamepad.buttondown.oculusremote.b1`, for example.
        self.emit(formatEvent(name + '.b' + detail.button.index, detail));

        if (detail.button.name) {
          // Emit `gamepad.buttondown.oculusremote.back`, for example.
          self.emit(formatEvent(name + '.' + detail.button.name, detail));
        }
      }
    }

    this.previousState = Object.assign({}, this.state);
  };

  Gamepads.prototype.buttonValue = function (btn) {
    if (!this.supported) { return 0; }
    return typeof btn === 'number' ? btn : btn.value;
  };

  Gamepads.prototype.buttonPressed = function (btn) {
    if (!this.supported) { return false; }
    return (typeof btn === 'number' ? btn : btn.value) > this.settings.buttonThreshold;
  };

  Gamepads.prototype.buttonName = function (gp, btnIndex) {
    if (!this.supported) { return; }
    return this.settings.mappings[gp.id] && this.settings.mappings[gp.id]['b' + btnIndex];
  };

  Gamepads.prototype.gamepadSlug = function (gp) {
    if (!this.supported) { return ''; }
    return slugify(gp.id);
  };

  Gamepads.prototype.emit = function (event) {
    if (!this.supported) { return; }
    if (this.settings.emitEventsOnWindow) {
      window.dispatchEvent(event);
    }
    if (this.settings.postMessageEventsOn !== null) {
      var el = this.settings.postMessageEventsOn;
      if (typeof el === 'string') {
        el = document.querySelector(this.settings.postMessageEventsOn);
      }
      if (el) {
        el.postMessage({type: 'event', data: {type: event.type, detail: event}}, '*');
      }
    }
  };

  var GAMEPADS_PLUS = new Gamepads(window.GAMEPADS_SETTINGS);

  if (typeof define === 'function' && define.amd) {
    define('GAMEPADS_PLUS', GAMEPADS_PLUS);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = GAMEPADS_PLUS;
  } else if (window) {
    window.GAMEPADS_PLUS = GAMEPADS_PLUS;
  }
})();
