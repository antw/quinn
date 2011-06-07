(function ($) {

    // The jQuery helper function. Permits $(...).quinn();
    $.fn.quinn = function (options) {
        $.each(this, function () { new Quinn($(this), options); });
    };

    // -----------------------------------------------------------------------

    /**
     * Quinn is the main slider class, and handles setting up the slider UI,
     * the element events, values, etc.
     */
    function Quinn (wrapper, options) {
        var selectMin, selectMax;

        _.bindAll(this, 'clickBar', 'enableDrag', 'disableDrag', 'drag');

        this.wrapper    = wrapper;
        this.options    = $.extend({}, Quinn.defaults, options);
        this.isDragging = false;

        // For convenience.
        this.range      = this.options.range;
        this.selectable = this.options.selectable ||
                          this.options.range.slice(0);

        // The "selectable" values need to be fixes so that they match up
        // with the "inverval" options. For example, if given an interval of
        // 2, the selectable range needs to be adjusted so that odd values
        // are not possible...
        selectMin = this.__roundToInterval(this.selectable[0]);
        selectMax = this.__roundToInterval(this.selectable[1]);

        if (selectMin != this.selectable[0]) {
            if (selectMin < this.selectable[0]) {
                this.selectable[0] = selectMin + this.options.interval;
            } else {
                this.selectable[0] = selectMin;
            }
        }

        if (selectMax != this.selectable[1]) {
            if (selectMax > this.selectable[1]) {
                this.selectable[1] = selectMax - this.options.interval;
            } else {
                this.selectable[1] = selectMax;
            }
        }

        this.render();
        this.setValue(this.options.value, false, false);

        this.wrapper.
            delegate('.bar',    'click',     this.clickBar).
            delegate('.handle', 'mousedown', this.enableDrag);

        // Fire the onSetup callback.
        if (_.isFunction(this.options.onSetup)) {
            this.options.onSetup(this.value, this);
        }
    }

    /**
     * Quinn is initialized with an empty wrapper element; render adds the
     * necessary DOM elements in order to display the slider UI.
     *
     * render() is called automatically when creating a new Quinn instance,
     * but should be called again if the slider is resized.
     */
    Quinn.prototype.render = function () {
        // The slider depends on some absolute positioning, so  adjust the
        // elements widths and positions as necessary ...
        var barWidth = this.wrapper.width(),
            movableRange, handleWidth, handleDangle;

        function addRoundingElements(element) {
            element.append($('<div />', { 'class': 'left'  }));
            element.append($('<div />', { 'class': 'main'  }));
            element.append($('<div />', { 'class': 'right' }));
        }

        this.bar       = $('<div />', { 'class': 'bar' });
        this.activeBar = $('<div />', { 'class': 'active-bar' });
        this.handle    = $('<a />',   { 'class': 'handle' });

        addRoundingElements(this.bar);
        addRoundingElements(this.activeBar);

        movableRange = $('<div />', { 'class': 'movable-range' });

        this.bar.append(this.activeBar);
        this.wrapper.html(this.bar);
        this.wrapper.addClass('quinn');

        this.wrapper.append(movableRange.append(this.handle));

        // Now, correctly position the elements ...

        this.bar.css({ width: barWidth.toString() + 'px' });
        handleWidth = this.handle.width();

        // The "dangle" allows the handle to appear slightly to the left of
        // the slider bar.
        handleDangle = Math.round(handleWidth * 0.25);

        this.bar.css({
            marginLeft: handleDangle.toString() + 'px',
            width:      (barWidth - (handleDangle * 2)).toString() + 'px'
        });

        this.wrapper.find('.movable-range').css({
            marginLeft: (-barWidth + handleDangle).toString() + 'px',
            width: (barWidth - handleWidth).toString() + 'px'
        });
    };

    /**
     * Moves the position of the slider handle, and the active-bar background
     * elements. Does not change the slider value (use setValue()).
     */
    Quinn.prototype.setPosition = function (percent, animate) {
        var opts = this.options,
            percentStr, barPercentStr, barMin, barMinAsPercent;

        // No error handling atm.
        percent = this.__extractNumber(percent);
        percentStr = percent.toString() + '%';

        if (animate && opts.effects) {
            barPercentStr = percentStr;

            // animating the bar to less then it's minimum width results in
            // weird glitches, so use the min-width when necessary.
            barMin = this.__extractNumber(this.activeBar.css('min-width'));

            if (barMin) {
                barMinAsPercent = this.bar.width();
                barMinAsPercent = (barMin / barMinAsPercent) * 100;

                if (percent < barMinAsPercent) {
                    barPercentStr = barMin.toString() + 'px';
                }
            }

            this.handle.animate({ left: percentStr }, opts.effectSpeed);
            this.activeBar.animate({ width: barPercentStr }, opts.effectSpeed);
        } else {
            this.handle.css('left', percentStr);
            this.activeBar.css('width', percentStr);
        }
    };

    Quinn.prototype.setValue = function (newValue, animate, doCallback) {
        if (_.isNull(newValue)) {
            newValue = this.range[0];
        }

        var delta = this.range[1] - this.range[0], percent;

        // Round the value according to the interval settings.
        newValue = this.__roundToInterval(newValue);

        if (newValue === this.value) {
            return false;
        }

        // Adjusting the value may have resulted in it being rounded to a
        // value outside the acceptable range.
        if (newValue < this.selectable[0]) {
            newValue = this.selectable[0];
        } else if (newValue > this.selectable[1]) {
            newValue = this.selectable[1];
        }

        // Run the onChange callback; if the callback returns false then stop
        // immediately and do not change the value.
        if (_.isFunction(this.options.onChange) && doCallback !== false) {
            if (this.options.onChange(newValue, this) === false ) {
                return false;
            }
        }

        percent = (newValue - this.range[0]) / delta * 100;

        this.setPosition(percent.toString() + '%', animate);
        this.value = newValue;

        return true;
    }

    Quinn.prototype.clickBar = function (event) {
        this.setValue(this.__valueFromMouse(event.pageX), true);
        return event.preventDefault();
    };

    Quinn.prototype.enableDrag = function (event) {
        if (! event.which === 1) {
            return true; // Not left mouse button.
        }

        this.isDragging = true;
        this.handle.addClass('active');

        $(document).
            bind('mouseup.quinn',   this.disableDrag).
            bind('mousemove.quinn', this.drag).

            // The mouse may leave the window while dragging, and the mouse
            // button released. Watch for the mouse re-entering, and see what
            // the button is doing.
            bind('mouseenter.quinn', this.disableDrag);

        return event.preventDefault();
    };

    Quinn.prototype.disableDrag = function (event) {
        $(document).
            unbind('mouseup.quinn').
            unbind('mousemove.quinn').
            unbind('mouseenter.quinn');

        this.handle.removeClass('active');

        this.isDragging = false;

        return event.preventDefault();
    };

    Quinn.prototype.drag = function (event) {
        this.setValue(this.__valueFromMouse(event.pageX));
        return event.preventDefault();
    };

    Quinn.prototype.__extractNumber = function (string) {
        var value = 0;

        if (_.isString(string)) {
            value = string.match(/^\d+/);
            value = value && parseInt(value[0], 10) || 0;
        } else if (_.isNumber(string)) {
            value = string;
        }

        return value;
    };

    Quinn.prototype.__valueFromMouse = function (mousePosition) {
        var percent = this.__positionFromMouse(mousePosition),
            delta   = this.range[1] - this.range[0];

        return this.range[0] + delta * (percent / 100);
    };

    Quinn.prototype.__positionFromMouse = function (mousePosition) {
        var barWidth = this.bar.width(),
            maxLeft  = this.bar.offset().left,
            maxRight = maxLeft + barWidth,
            barPosition;

        if (mousePosition < maxLeft) {
            // Mouse is to the left of the bar.
            barPosition = 0;
        } else if (mousePosition > maxRight) {
            // Mouse is to the right of the bar.
            barPosition = barWidth;
        } else {
            barPosition = mousePosition - this.bar.offset().left;
        }

        return barPosition / barWidth * 100;
    };

    /**
     * Given a number, rounds it to the nearest interval.
     *
     * For example, if options.interval is 5, given 4 will round to 5. Given
     * 2 will round to 0, etc. Does not take account of the minimum and
     * maximum range options.
     */
    Quinn.prototype.__roundToInterval = function (number) {
        var multiplier = 1 / this.options.interval,
            rounded    = Math.round(number * multiplier) / multiplier;

        // if (rounded > this.range[1] ) {
        //     return this.range[1];
        // } else if (rounded < this.range[0]) {
        //     return this.range[0];
        // } else {
            return rounded;
        // }
    };

    /**
     * Options used when creating a Quinn instance when not explicitly given
     * by a developer.
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
        interval: 1,

        // The initial value of the slider. null = the lowest value in the
        // range option.
        value: null,

        // A callback which is run when changing the slider value. Additional
        // callbacks may be added with Quinn#bind('change').
        //
        // Arguments:
        //   number: the altered slider value
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

        // When using animations (such as clicking on the bar), how long
        // should the duration be? Any jQuery effect duration value is
        // permitted.
        effectSpeed: 'fast',

        // Set to false to disable all animation on the slider.
        effects: true
    };

})(jQuery);
