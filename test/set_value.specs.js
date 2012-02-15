QUnit.specify('', function () {

    describe('setValue', function () {
        var wrapper = $('#slider'), slider;

        after(function () {
            wrapper.html('');
        });

        describe('when setting a value', function () {
            before(function () {
                slider = new $.Quinn(wrapper);
                slider.setValue(50);
            });

            it('should set the new value', function () {
                assert(slider.model.value).equals(50);
            });

            it('should not permit values larger than the selectable range', function () {
                assert(slider.setValue(101)).equals(100);
                assert(slider.model.value).equals(100);
            });

            it('should not permit values smaller than the selectable range', function () {
                assert(slider.setValue(-1)).equals(0);
                assert(slider.model.value).equals(0);
            });

            it('should run the onDrag callback', function () {
                var onDragRun = false;

                slider = new $.Quinn(wrapper, {
                    onDrag: function () {
                        onDragRun = true;
                    }
                });

                slider.setValue(50);
                assert(onDragRun).isTrue();
            });

            it('should run the onChange callback', function () {
                var onChangeRun = false;

                slider = new $.Quinn(wrapper, {
                    onChange: function () {
                        onChangeRun = true;
                    }
                });

                slider.setValue(50);
                assert(onChangeRun).isTrue();
            });
        }); // when setting a value

        describe('when the slider is disabled', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { disable: true });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(50)).equals(false)
                assert(slider.model.value).equals(0);
            });
        }); // when the slider is disabled

        describe('when given no argument', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: 50 });
            });

            it('should do nothing', function () {
                assert(slider.setValue()).equals(50);
                assert(slider.model.value).equals(50);
            });
        }); // when given no argument

        describe('when the value does not match the step', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { step: 7 });
            });

            it('should round to the nearest step', function () {
                var values = [ 0, 6, 7, 8, 9, 10, 11 ],
                    rounds = [ 0, 7, 7, 7, 7,  7, 14 ],
                    rounded;

                rounded = _.map(values, function (value) {
                    slider.setValue(value);
                    return slider.model.value;
                });

                assert(rounded).isSameAs(rounds);
            });
        }); // when the value does not match the step

        describe('when the onDrag callback returns false', function () {
            var onChangeRun;

            before(function () {
                slider = new $.Quinn(wrapper, {
                    onDrag:   function () { return false },
                    onChange: function () { onChangeRun = true; }
                });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(5)).equals(0);
                assert(slider.model.value).equals(0);
            });

            it('should not run onChange', function () {
                slider.setValue(5);
                assert(onChangeRun).isFalse();
            });
        }); // when the onDrag callback returns false

        describe('when the onChange callback returns false', function () {
            before(function () {
                slider = new $.Quinn(wrapper, {
                    onChange: function () { return false }
                });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(5)).equals(0);
                assert(slider.model.value).equals(0);
            });
        }); // when the onChange callback returns false

        describe('when the value is unchanged', function () {
            var onDragRun, onChangeRun;

            before(function () {
                slider = new $.Quinn(wrapper, {
                    onDrag:   function () { onDragRun   = true; },
                    onChange: function () { onChangeRun = true; }
                });

                onDragRun   = false;
                onChangeRun = false;

                slider.setValue(0);
            });

            it('should not run onDrag', function () {
                assert(onDragRun).isFalse();
            });

            it('should not run onChange', function () {
                assert(onChangeRun).isFalse();
            });
        }); // when the value is unchanged

        describe('when using the only option', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: 40, only: [10, 20, 50] });
            });

            it('should do nothing when given no argument', function () {
                assert(slider.setValue()).equals(50);
                assert(slider.model.value).equals(50);
            });

            it('should set the given value', function () {
                assert(slider.setValue(20)).equals(20);
                assert(slider.model.value).equals(20);

                assert(slider.setValue(10)).equals(10);
                assert(slider.model.value).equals(10);
            });

            it('should set the nearest value when not exact', function () {
                assert(slider.setValue(40)).equals(50);
                assert(slider.model.value).equals(50);
            });
        }); // when using the only option

        describe('when using a range-based slider', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: [25, 75] });
            });

            it('should set the new values', function () {
                slider.setValue([10, 90]);
                assert(_.isEqual([10, 90], slider.model.value)).isTrue();
            });

            it('should not permit an integer value', function () {
                assert(_.isEqual(slider.setValue(10), [25, 75])).isTrue();
                assert(_.isEqual([25, 75], slider.model.value)).isTrue();
            });
        });
    });
});
