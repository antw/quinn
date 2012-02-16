// vim: set sw=4 ts=4 et:

(function ($, _) {
    "use strict";

    // Event names used for setting up drag events.
    var DRAG_E           = 'mousemove',
        DRAG_START_E     = 'mousedown',
        DRAG_END_E       = 'mouseup',
        IS_TOUCH_ENABLED =  false;

    if ('ontouchstart' in document.documentElement) {
        DRAG_E           = 'touchmove';
        DRAG_START_E     = 'touchstart';
        DRAG_END_E       = 'touchend';
        IS_TOUCH_ENABLED =  true;
    }

    /**
     * Given an event, returns the horizontal location on the page on which
     * the event occurred.
     */
    function locationOfEvent (event) {
        if (event.type === 'touchmove') {
            return event.originalEvent.targetTouches[0].pageX;
        }

        return event.pageX;
    }

    /**
     * ## Quinn
     *
     * Quinn is the main slider class, and handles setting up the slider UI,
     * the element events, values, etc.
     *
     * `wrapper` is expected to be a DOM Element wrapped in a jQuery instance.
     * The slider will be placed into the wrapper element, respecting it's
     * width, padding etc.
     */
    function Quinn (wrapper, options) {
        _.bindAll(this, 'clickBar', 'startDrag', 'drag', 'endDrag');

        this.wrapper       = wrapper;
        this.options       = _.extend({}, Quinn.defaults, options);
        this.callbacks     = {};

        this.disabled      = false;
        this.activeHandle  = null;
        this.previousValue = null;

        this.model         = new Model(this);
        this.renderer      = new this.options.renderer(this);

        this.leftExtent    = this.options.range[0];
        this.rightExtent   = this.options.range[1];

        this.on('setup',  this.options.onSetup);
        this.on('begin',  this.options.onBegin);
        this.on('drag',   this.options.onDrag);
        this.on('change', this.options.onChange);
        this.on('abort',  this.options.onAbort);

        if (_.isFunction(this.renderer.render)) {
            this.renderer.render();
        }

        if (this.options.disable === true) {
            this.disable();
        }

        // Finish off by triggering the setup callback.
        this.trigger('setup', this.model.value);
    }

    // ### Event Handling

    /**
     * ### on
     *
     * Binds a `callback` to be run whenever the given `event` occurs. Returns
     * the Quinn instance permitting chaining.
     */
    Quinn.prototype.on = function (event, callback) {
        if (_.isString(event) && _.isFunction(callback)) {
            if (! this.callbacks[event]) {
                this.callbacks[event] = [];
            }

            this.callbacks[event].push(callback);
        }

        return this;
    };

    /**
     * ### trigger
     *
     * Runs the callbacks of the given evengt type.
     *
     * If any of the callbacks return false, other callbacks will not be run,
     * and trigger will return false; otherwise true is returned.
     */
    Quinn.prototype.trigger = function (event, value) {
        var callbacks = this.callbacks[event] || [],
            callback, i = 0;

        if (value === void 0) {
            value = this.value;
        }

        while (callback = callbacks[i++]) {
            if (callback(value, this) === false) {
                return false;
            }
        }

        return true;
    };

    // ## Values, and Domain Logic

    /**
     * ### enable
     *
     * Enables the slider so that a user may change its value. Triggers the
     * "enabled" event unless the instance was already enabled.
     */
    Quinn.prototype.enable = function () {
        if (this.disabled) {
            this.disabled = false;
            this.trigger('enabled');
        }
    };

    /**
     * ### disable
     *
     * Disables the slider so that a user may not change its value. Triggers
     * the "disabled" event unless the instance was already disabled.
     */
    Quinn.prototype.disable = function () {
        if (! this.disabled) {
            this.disabled = true;
            this.trigger('disabled');
        }
    };

    /**
     * ### setValue
     *
     * Updates the value of the slider to `newValue`. If the `animate`
     * argument is truthy, the change in value will be animated when updating
     * the slider position. The drag callback may be skipped if `silent` is
     * true.
     */
    Quinn.prototype.setValue = function (newValue, animate, silent) {
        if (this.willChange()) {
            if (this.setTentativeValue(newValue, animate, silent) !== false) {
                this.hasChanged();
            } else {
                this.abortChange();
            }
        }

        return this.model.value;
    };

    /**
     * ### setTentativeValue
     *
     * Used internally to set the model value while ensuring that the
     * necessary callbacks are fired.
     *
     * See `setValue`.
     */
    Quinn.prototype.setTentativeValue = function (newValue, animate, silent) {
        var preDragValue = this.model.value,
            scalar, prevScalar, nextScalar;

        if (newValue == null) {
            return false;
        }

        // If the slider is a range (more than one value), but only a number
        // was given, we need to alter the given value so that we set the
        // other values also.
        if (this.model.values.length > 1 && _.isNumber(newValue)) {
            if (this.activeHandle == null) {
                // Without an active handle, we don't know which value we are
                // supposed to set.
                return false;
            }

            scalar   = this.model.sanitizeValue(newValue);
            newValue = _.clone(this.model.values);

            // Ensure that the handle doesn't "cross over" a higher or
            // lower handle.

            prevScalar = newValue[this.activeHandle - 1];
            nextScalar = newValue[this.activeHandle + 1];

            if (prevScalar != null && scalar <= prevScalar) {
                scalar = prevScalar + this.options.step;
            }

            if (nextScalar != null && scalar >= nextScalar) {
                scalar = nextScalar - this.options.step;
            }

            newValue[this.activeHandle] = scalar;
        }

        newValue = this.model.setValue(newValue);

        if (newValue === false ||
                (! silent && ! this.trigger('drag', newValue))) {

            this.model.setValue(preDragValue);
            return false;
        }

        this.trigger('redraw', animate);

        return newValue;
    };

    /**
     * ### stepUp
     *
     * Increases the value of the slider by `step`. Does nothing if the slider
     * is alredy at its maximum value.
     *
     * The optional argument is an integer which indicates the number of steps
     * by which to increase the value.
     *
     * Returns the new slider value
     */
    Quinn.prototype.stepUp = function (count) {
        if (this.model.values.length > 1) {
            // Cannot step a range-based slider.
            return this.model.value;
        }

        return this.setValue(
            this.model.value + this.options.step * (count || 1));
    };

    /**
     * ### stepDown
     *
     * Decreases the value of the slider by `step`. Does nothing if the slider
     * is alredy at its minimum value.
     *
     * The optional argument is an integer which indicates the number of steps
     * by which to decrease the value.
     *
     * Returns the new slider value
     */
    Quinn.prototype.stepDown = function (count) {
        return this.stepUp(-(count || 1));
    };

    /**
     * ### willChange
     *
     * Tells the Quinn instance that the user is about to make a change to the
     * slider value. The calling function should check the return value of
     * willChange -- if false, no changes are permitted to the slider.
     */
    Quinn.prototype.willChange = function () {
        if (this.disabled === true || ! this.trigger('begin')) {
            return false;
        }

        this.previousValue = this.model.value;

        return true;
    };

    /**
     * ### hasChanged
     *
     * Tells the Quinn instance that the user has finished making their
     * changes to the slider and that the new value should be retained.
     */
    Quinn.prototype.hasChanged = function () {
        this.deactivateActiveHandle();

        /* Run the onChange callback; if the callback returns false then we
         * revert the slider change, and restore everything to how it was
         * before. Note that reverting the change will also fire an onChange
         * event when the value is reverted.
         */
        if (! this.trigger('change', this.model.value)) {
            this.setTentativeValue(this.previousValue);
            this.abortChange();

            return false;
        }

        if (this.previousValue === this.value) {
            // The user reset the slider back to where it was.
            this.abortChange();
        }
    };

    /**
     * ### abortChange
     *
     * Aborts a slider change.
     */
    Quinn.prototype.abortChange = function () {
        this.previousValue = null;
        this.deactivateActiveHandle();

        return this.trigger('abort');
    };

    /**
     * ### valueFromMouse
     *
     * Determines the value of the slider at the position indicated by the
     * mouse cursor.
     */
    Quinn.prototype.valueFromMouse = function (mousePosition) {
        var percent = this.positionFromMouse(mousePosition),
            delta   = this.rightExtent - this.leftExtent;

        return this.leftExtent + delta * percent;
    };

    /**
     * ### positionFromMouse
     *
     * Determines how far along the bar the mouse cursor is as a fraction of
     * the bar's width.
     *
     * TODO Cache the width and offset when the drag operation begins.
     */
    Quinn.prototype.positionFromMouse = function (mousePosition) {
        var barWidth = this.wrapper.width(),
            maxLeft  = this.wrapper.offset().left,
            maxRight = maxLeft + barWidth,
            barPosition;

        if (mousePosition < maxLeft) {
            // Mouse is to the left of the bar.
            barPosition = 0;
        } else if (mousePosition > maxRight) {
            // Mouse is to the right of the bar.
            barPosition = barWidth;
        } else {
            barPosition = mousePosition - maxLeft;
        }

        return barPosition / barWidth;
    };

    // ## User Interaction

    /**
     * ### startDrag
     *
     * Begins a drag event which permits a user to move the slider handle in
     * order to adjust the slider value.
     *
     * When `skipPreamble` is true, startDrag will not run `willChange()` on
     * the assumption that it has already been run (see `clickBar`).
     */
    Quinn.prototype.startDrag = function (event, skipPreamble) {
        // Only enable dragging when the left mouse button is used.
        if (! IS_TOUCH_ENABLED && event.which !== 1) {
            return true;
        }

        if (! skipPreamble && ! this.willChange()) {
            return false;
        }

        this.activateHandleWithEvent(event);

        // These events are bound for the duration of the drag operation and
        // keep track of the value changes made, with the events being removed
        // when the mouse button is released.
        $(document).
            on(DRAG_END_E + '.quinn', this.endDrag).
            on(DRAG_E     + '.quinn', this.drag).

            // The mouse may leave the window while dragging, and the mouse
            // button released. Watch for the mouse re-entering, and see what
            // the button is doing.
            on('mouseenter.quinn', this.endDrag);

        return false;
    };

    /**
     * ### drag
     *
     * Bound to the mousemove event, alters the slider value while the user
     * contiues to hold the left mouse button.
     */
    Quinn.prototype.drag = function (event) {
        var pageX = locationOfEvent(event),
            newValue;

        this.setTentativeValue(this.valueFromMouse(pageX), false);

        return event.preventDefault();
    };

    /**
     * ### endDrag
     *
     * Run when the user lifts the mouse button after completing a drag.
     */
    Quinn.prototype.endDrag = function (event) {
        // Remove the events which were bound in `startDrag`.
        $(document).
            off(DRAG_END_E + '.quinn').
            off(DRAG_E + '.quinn').
            off('mouseenter.quinn');

        this.hasChanged();

        return event.preventDefault();
    };

    /**
     * ### clickBar
     *
     * Event handler which is used when the user clicks part of the slider bar
     * to instantly change the value.
     */
    Quinn.prototype.clickBar = function (event) {
        // Ignore the click if the left mouse button wasn't used.
        if (! IS_TOUCH_ENABLED && event.which !== 1) {
            return true;
        }

        if (this.willChange()) {
            this.activateHandleWithEvent(event);
            this.setTentativeValue(this.valueFromMouse(event.pageX));

            // Allow user to further refine the slider value by dragging
            // without releasing the mouse button. `endDrag` will take care of
            // committing the final updated value. This doesn't work nicely on
            // touch devices, so we don't do this there.
            if (IS_TOUCH_ENABLED) {
                this.hasChanged();
            } else {
                this.startDrag(event, true);
            }
        }

        return event.preventDefault();
    }

    /**
     * Given a click or drag event, determines which model "value" is closest
     * to the clicked location and tells the view to activate the handle.
     * Does nothing if a handle is already active.
     */
    Quinn.prototype.activateHandleWithEvent = function (event) {
        var value, closestValue;

        if (this.activeHandle) {
            return false;
        }

        value = this.valueFromMouse(locationOfEvent(event));

        closestValue = _.min(this.model.values, function (handleValue) {
            return Math.abs(handleValue - value);
        });

        this.activeHandle = _.indexOf(this.model.values, closestValue);

        this.trigger('handleOn', this.activeHandle);
    };

    /**
     * Deactivates the currently active handle. Does nothing if no handle is
     * active.
     */
    Quinn.prototype.deactivateActiveHandle = function () {
        if (this.activeHandle != null) {
            this.trigger('handleOff', this.activeHandle);
            this.activeHandle = null;
        }
    };

    /**
     * ## Model
     *
     * Holds the current Quinn value, ensures that the value set is valid
     * (within the `range` bounds, one of the `only` values, etc).
     */
    function Model (quinn) {
        var extrema, minimum, maximum, initialValue, length, i;

        this.options        = quinn.options;
        this.values         = [];
        this.previousValues = [];

        this.step           = quinn.options.step;
        this.only           = quinn.options.only;

        /* The minimum and maximum need to be "fixed" so that they are a
         * multiple of the "step" option. For example, if given a step of 5
         * then we must round a minimum value of 2 up to 5, and a maximum
         * value of 97 down to 95.
         *
         * Note that values are always rounded so that they stay within the
         * given minimum and maximum range. 2 cannot be rounded down to 0,
         * since that is lower than the value provided by the user.
         *
         * TODO Provided this.min and this.max are set, isn't it possible
         *      to just use sanitizeValue?
         */

        extrema = this.options.selectable || this.options.range;

        this.minimum = this.roundToStep(extrema[0]);
        this.maximum = this.roundToStep(extrema[1]);

        if (this.minimum < extrema[0]) {
            this.minimum += this.step;
        }

        if (this.maximum > extrema[1]) {
            this.maximum -= this.step;
        }

        /* Determine the initial value of the slider. Prefer an explicitly set
         * value, whether a scalar or an array. If no value is provided by the
         * developer, instead fall back to using the minimum.
         */

        if (this.options.value == null) {
            initialValue = this.minimum;
        } else if (_.isArray(this.options.value)) {
            initialValue = this.options.value;
        } else {
            initialValue = [ this.options.value ];
        }

        for (i = 0, length = initialValue.length; i < length; i++) {
            this.values[i] = null;
        }

        this.setValue(initialValue);
    }

    /**
     * An internal method which sets the value of the slider during a drag
     * event. `setValue` should be called only after `willChange` in the Quinn
     * instance.
     *
     * Only when `hasChanged` is called is the value considered final. If
     * `abortChange` is called, the tentative value is discarded and the
     * previous "good" value is restored.
     *
     * The new value will be returned (which may differ slightly from the
     * value you set, if it had to be adjusted to fit the step option, or stay
     * within the minimum / maximum range). The method will return false if
     * the value you set resulted in no changes.
     */
    Model.prototype.setValue = function (newValue) {
        var originalValue = this.values, length, i;

        if (! _.isArray(newValue)) {
            newValue = [ newValue ];
        } else {
            // Don't mutate the original array.
            newValue = _.clone(newValue);
        }

        for (i = 0, length = newValue.length; i < length; i++) {
            newValue[i] = this.sanitizeValue(newValue[i]);
        }

        if (_.isEqual(newValue, originalValue)) {
            return false;
        }

        this.value = this.values = newValue;

        if (this.values.length === 1) {
            // When the slider represents only a single value, instead of
            // setting an array as the value, just use the number.
            this.value = newValue[0];
        }

        return this.value;
    };

    /**
     * ### roundToStep
     *
     * Given a number, rounds it to the nearest step.
     *
     * For example, if options.step is 5, given 4 will round to 5. Given
     * 2 will round to 0, etc. Does not take account of the minimum and
     * maximum range options.
     */
    Model.prototype.roundToStep = function (number) {
        var multiplier = 1 / this.step,
            rounded    = Math.round(number * multiplier) / multiplier;

        if (_.isArray(this.only)) {
            rounded = _.min(this.only, function (value) {
                return Math.abs(value - number);
            });
        }

        if (rounded > this.maximum) {
            return rounded - this.step;
        } else if (rounded < this.minimum) {
            return rounded + this.step;
        }

        return rounded;
    };

    /**
     * ### sanitizeValue
     *
     * Given a numberic value, snaps it to the nearest step, and ensures that
     * it is within the selectable minima and maxima.
     */
    Model.prototype.sanitizeValue = function (value) {
        value = this.roundToStep(value);

        if (value > this.maximum) {
            return this.maximum;
        } else if (value < this.minimum) {
            return this.minimum;
        }

        return value;
    };

    /**
     * ## Renderer
     *
     * Handles creation of the DOM nodes used by Quinn, as well as redrawing
     * those elements when the slider value is changed.
     *
     * You may write your own renderer class and provide it to Quinn using the
     * `renderer: myRenderer` option.
     *
     * Your class needs to define only two public methods:
     *
     * render:
     *   Creates the DOM elements for displaying the slider, and inserts them
     *   into the tree.
     *
     * redraw:
     *   Alters DOM elements (normally CSS) so that the visual representation
     *   of the slider matches the value.
     */
    Quinn.Renderer = function (quinn) {
        _.bindAll(this, 'render', 'redraw');

        var self = this;

        this.quinn   = quinn;
        this.model   = quinn.model;
        this.wrapper = quinn.wrapper;
        this.options = quinn.options;
        this.handles = [];

        // The values which are at the far left and far right of the bar.
        // These may differ slightly from the values which are permitted for
        // the model if the developer specified different `range` and
        // `selectable` options.
        this.drawMin = quinn.options.range[0];
        this.drawMax = quinn.options.range[1];

        this.activeHandle = null;

        quinn.on('redraw', this.redraw);

        quinn.on('handleOn', function (handleIndex) {
            self.handles[handleIndex].addClass('active');
        });

        quinn.on('handleOff', function (handleIndex) {
            self.handles[handleIndex].removeClass('active');
        });

        quinn.on('enabled', function () {
            self.wrapper.removeClass('disabled');

            if (self.options.disabledOpacity !== 1.0) {
                self.wrapper.css('opacity', 1.0);
            }
        });

        quinn.on('disabled', function () {
            self.wrapper.addClass('disabled');

            if (self.options.disabledOpacity !== 1.0) {
                self.wrapper.css('opacity', self.options.disabledOpacity);
            }
        });
    }

    /**
     * ### render
     *
     * Quinn is initialized with an empty wrapper element; render adds the
     * necessary DOM elements in order to display the slider UI.
     *
     * render() is called automatically when creating a new Quinn instance,
     * but should be called again if the slider is resized.
     */
    Quinn.Renderer.prototype.render = function () {
        var i, length;

        this.width = this.options.width || this.wrapper.width();

        function addRoundingElements (element) {
            element.append($('<div class="left" />'));
            element.append($('<div class="main" />'));
            element.append($('<div class="right" />'));
        }

        this.bar      = $('<div class="bar" />');
        this.deltaBar = $('<div class="delta-bar" />');

        if (this.model.values.length > 1) {
            this.wrapper.addClass('range');
        }

        addRoundingElements(this.bar);

        if (this.model.values.length <= 2) {
            addRoundingElements(this.deltaBar);
            this.bar.append(this.deltaBar);
        }

        this.wrapper.html(this.bar);
        this.wrapper.addClass('quinn');

        // Add each of the handles to the bar, and bind the click events.
        for (i = 0, length = this.model.values.length; i < length; i++) {
            this.handles[i] = $('<span class="handle"></span>');
            this.handles[i].on(DRAG_START_E, this.quinn.startDrag);
            this.bar.append(this.handles[i]);
        }

        // Finally, these events are triggered when the user seeks to
        // update the slider.
        this.wrapper.on('mousedown', this.quinn.clickBar);

        this.redraw(false);
    };

    /**
     * ### redraw
     *
     * Moves the slider handle and the delta-bar background elements so that
     * they accurately represent the value of the slider.
     */
    Quinn.Renderer.prototype.redraw = function (animate) {
        var opts  = this.options,
            min   = this.quinn.leftExtent,
            max   = this.quinn.rightExtent,
            delta = max - min;

        if (animate == void 0) {
            animate = true;
        }

        _.each(this.handles, _.bind(function(handle, i) {
            var percent, inPixels;

            handle.stop(true);

            // Convert the value percentage to pixels so that we can position
            // the handle accounting for the movementAdjust option.
            percent  = (this.model.values[i] - min) / delta;
            inPixels = ((this.width - 5) * percent).toString() + 'px'

            if (animate && opts.effects) {
                handle.animate({ left: inPixels }, {
                    duration: opts.effectSpeed,
                    step: _.bind(function (now) {
                        now = now / this.width;

                        // "now" is the current "left" position of the handle.
                        // Convert that to the equivalent value. For example,
                        // if the slider is 0->200, and now is 20, the
                        // equivalent value is 40.
                        this.redrawDeltaBar(now *
                            (max - min) + min, handle);

                        return true;
                    }, this)
                });
            } else {
                // TODO being in the loop results in an unnecessary
                //      additional call to redrawDeltaBar
                handle.css('left', inPixels);
                this.redrawDeltaBar(this.model.value);
            }
        }, this));
    };

    /**
     * ### redrawDeltaBar
     *
     * Positions the blue delta bar so that it originates at a position where
     * the value 0 is. Accepts a `value` argument so that it may be used
     * within a `step` callback in a jQuery `animate` call.
     */
    Quinn.Renderer.prototype.redrawDeltaBar = function (value, handle) {
        var leftPosition = null,
            rightPosition = null;

        this.deltaBar.stop(true);

        if (this.model.values.length > 1) {
            if (handle) {
                if (handle === this.handles[0]) {
                    leftPosition  = this.__positionForValue(value);
                } else {
                    rightPosition = this.__positionForValue(value);
                }
            } else {
                leftPosition  = this.__positionForValue(value[0]);
                rightPosition = this.__positionForValue(value[1]);
            }
        } else if (value < 0) {
            // position with the left edge underneath the handle, and the
            // right edge at 0
            leftPosition  = this.__positionForValue(value);
            rightPosition = this.__positionForValue(0);
        } else {
            // position with the right edge underneath the handle, and the
            // left edge at 0
            leftPosition  = this.__positionForValue(0);
            rightPosition = this.__positionForValue(value);
        }

        rightPosition = this.bar.width() - rightPosition;

        if (leftPosition !== null) {
            this.deltaBar.css('left', leftPosition.toString() + 'px');
        }

        if (rightPosition !== null) {
            this.deltaBar.css('right', rightPosition.toString() + 'px');
        }
    };

    /**
     * ### __positionForValue
     *
     * Given a slider value, returns the position in pixels where the value is
     * on the slider bar. For example, in a 200px wide bar whose values are
     * 1->100, the value 20 is found 40px from the left of the bar.
     */
    Quinn.Renderer.prototype.__positionForValue = function (value) {
        var delta    = this.quinn.rightExtent - this.quinn.leftExtent,
            position = (((value - this.quinn.leftExtent) / delta)) * this.width;

        if (position < 0) {
            return 0;
        } else if (position > this.width) {
            return this.width;
        } else {
            return Math.round(position);
        }
    };

    /**
     * ### Options
     *
     * Default option values which are used when the user does not explicitly
     * provide them.
     */
    Quinn.defaults = {
        // An array with the lowest and highest values represented by the
        // slider.
        range: [0, 100],

        // The range of values which can be selected by the user. Normally
        // this would be the same as "range", however this option allows you
        // to make only a portion of the slider selectable.
        selectable: null,

        // The "steps" by which the selectable value increases. For example,
        // when set to 2, the default slider will increase in steps from 0, 2,
        // 4, 8, etc.
        step: 1,

        // The initial value of the slider. null = the lowest value in the
        // range option.
        value: null,

        // Restrics the values which may be chosen to those listed in the
        // `only` array.
        only: null,

        // Disables the slider when initialized so that a user may not change
        // it's value.
        disable: false,

        // By default, Quinn fades the opacity of the slider to 50% when
        // disabled, however this may not work perfectly with older Internet
        // Explorer versions when using transparent PNGs. Setting this to 1.0
        // will tell Quinn not to fade the slider when disabled.
        disabledOpacity: 0.5,

        // If using Quinn on an element which isn't attached to the DOM, the
        // library won't be able to determine it's width; supply it as a
        // number (in pixels).
        width: null,

        // If using Quinn on an element which isn't attached to the DOM, the
        // library won't be able to determine the width of the handle; suppl
        // it as a number (in pixels).
        handleWidth: null,

        // A callback which is run when changing the slider value. Additional
        // callbacks may be added with Quinn::on('drag').
        //
        // Arguments:
        //   number: the altered slider value
        //   Quinn:  the Quinn instance
        //
        onDrag: null,

        // Run after the user has finished making a change.
        //
        // Arguments:
        //   number: the new slider value
        //   Quinn:  the Quinn instance
        //
        onChange: null,

        // Run once after the slider has been constructed.
        //
        // Arguments:
        //   number: the current slider value
        //   Quinn:  the Quinn instance
        //
        onSetup: null,

        // An optional class which is used to render the Quinn DOM elements
        // and redraw them when the slider value is changed. This should be
        // the class; Quinn will create the instance, passing the wrapper
        // element and the options used when $(...).quinn() is called.
        //
        // Arguments:
        //   Quinn:  the Quinn instance
        //   object: the options passed to $.fn.quinn
        //
        renderer: Quinn.Renderer,

        // When using animations (such as clicking on the bar), how long
        // should the duration be? Any jQuery effect duration value is
        // permitted.
        effectSpeed: 'fast',

        // Set to false to disable all animation on the slider.
        effects: true
    };

    // -----------------------------------------------------------------------

    // The jQuery helper function. Permits $(...).quinn();
    $.fn.quinn = function (options) {
        return $.each(this, function () { new Quinn($(this), options); });
    };

    // Expose Quinn to the world on $.Quinn.
    $.Quinn = Quinn;

})(jQuery, _);
