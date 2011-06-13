QUnit.specify('', function () {
    var wrapper = $('#slider'), slider;

    describe('setValue', function () {
        describe('When setting a value', function () {
            before(function () {
                slider = new $.Quinn(wrapper);
                slider.setValue(50);
            });

            it('should set the new value', function () {
                assert(slider.value).equals(50);
            });

            it('should add the old value to previousValues', function () {
                assert(slider.previousValues).equals([0]);
            });

            it('should not permit values larger than the selectable range', function () {
                assert(slider.setValue(101)).equals(50);
                assert(slider.value).equals(50);
            });

            it('should not permit values smaller than the selectable range', function () {
                assert(slider.setValue(-1)).equals(50);
                assert(slider.value).equals(50);
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

            it('should run the onComplete callback', function () {
                var onCompleteRun = false;

                slider = new $.Quinn(wrapper, {
                    onComplete: function () {
                        onCompleteRun = true;
                    }
                });

                slider.setValue(50);
                assert(onCompleteRun).isTrue();
            });
        });

        describe('When the slider is disabled', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { disable: true });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(50)).equals(false)
                assert(slider.value).equals(0);
            });

            it('should not change previousValues', function () {
                assert(slider.previousValues.length).equals(0);
            });
        });

        describe('When given no argument', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: 50 });
            });

            it('should set the slider to the minimum value', function () {
                assert(slider.setValue()).equals(0);
                assert(slider.value).equals(0);
            });

            it('should add the old value to previousValues', function () {
                assert(slider.previousValues).equals([50]);
            });
        });

        describe('When the value does not match the step', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { step: 7 });
            });

            it('should round to the nearest step', function () {
                var values = [ 0, 6, 7, 8, 9, 10, 11 ],
                    rounds = [ 0, 7, 7, 7, 7,  7, 14 ],
                    rounded;

                rounded = _.map(values, function (value) {
                    slider.setValue(value);
                    return slider.value;
                });

                assert(rounded).isSameAs(rounds);
            });

        });

        describe('When the onChange callback returns false', function () {
            var onCompleteRun;

            before(function () {
                slider = new $.Quinn(wrapper, {
                    onChange:   function () { return false },
                    onComplete: function () { onCompleteRun = true; }
                });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(5)).equals(0);
                assert(slider.value).equals(0);
            });

            it('should not change previousValues', function () {
                assert(slider.previousValues.length).equals(0);
            });

            it('should not run onComplete', function () {
                slider.setValue(5);
                assert(onCompleteRun).isFalse();
            });
        });

        describe('When the onComplete callback returns false', function () {
            before(function () {
                slider = new $.Quinn(wrapper, {
                    onComplete: function () { return false }
                });
            });

            it('should not change the slider value', function () {
                assert(slider.setValue(5)).equals(0);
                assert(slider.value).equals(0);
            });

            it('should not change previousValues', function () {
                assert(slider.previousValues.length).equals(0);
            });
        });

        describe('When the value is unchanged', function () {
            var onChangeRun, onCompleteRun;

            before(function () {
                slider = new $.Quinn(wrapper, {
                    onChange:   function () { onChangeRun   = true },
                    onComplete: function () { onCompleteRun = true; }
                });

                slider.setValue(0);
            });

            it('should not change previousValues', function () {
                assert(slider.previousValues.length).equals(0);
            });

            it('should not run onChange', function () {
                assert(onChangeRun).isFalse();
            });

            it('should not run onComplete', function () {
                assert(onCompleteRun).isFalse();
            });
        });
    });
});
