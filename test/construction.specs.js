QUnit.specify('', function () {

    describe('Constructor', function () {
        var wrapper = $('#slider'), slider;

        after(function () {
            wrapper.html('');
        });

        describe('With default settings', function () {
            before(function () {
                slider = new $.Quinn(wrapper);
            });

            it('should set the  value to 0', function () {
                assert(slider.model.value).equals(0);
            });

            it('should set the lower range value to 0', function () {
                assert(slider.leftExtent).equals(0);
            });

            it('should set the upper range value to 100', function () {
                assert(slider.rightExtent).equals(100);
            });

            it('should set the lower selectable value to 0', function () {
                assert(slider.model.minimum).equals(0);
            });

            it('should set the upper selectable value to 100', function () {
                assert(slider.model.maximum).equals(100);
            });

            it('should not be disabled', function () {
                assert(slider.disabled).isFalse();
            });
        }); // With default settings

        describe('With range: [20, 40]', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { range: [20, 40] });
            });

            it('should set the value to 20', function () {
                assert(slider.model.value).equals(20);
            });

            it('should set the lower range value to 20', function () {
                assert(slider.leftExtent).equals(20);
            });

            it('should set the upper range value to 40', function () {
                assert(slider.rightExtent).equals(40);
            });

            it('should set the lower selectable value to 20', function () {
                assert(slider.model.minimum).equals(20);
            });

            it('should set the upper selectable value to 40', function () {
                assert(slider.model.maximum).equals(40);
            });
        }); // With range: [20, 40]

        describe('With selectable: [20, 40]', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { selectable: [20, 40] });
            });

            it('should set the value to 20', function () {
                assert(slider.model.value).equals(20);
            });

            it('should set the lower range value to 0', function () {
                assert(slider.leftExtent).equals(0);
            });

            it('should set the upper range value to 100', function () {
                assert(slider.rightExtent).equals(100);
            });

            it('should set the lower selectable value to 20', function () {
                assert(slider.model.minimum).equals(20);
            });

            it('should set the upper selectable value to 40', function () {
                assert(slider.model.maximum).equals(40);
            });
        }); // With selectable: [20, 40]

        describe('With step: 15', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { step: 15 });
            });

            it('should set the value to 0', function () {
                assert(slider.model.value).equals(0);
            });

            it('should set the lower range value to 0', function () {
                assert(slider.leftExtent).equals(0);
            });

            it('should set the upper range value to 100', function () {
                assert(slider.rightExtent).equals(100);
            });

            it('should set the lower selectable value to 0', function () {
                assert(slider.model.minimum).equals(0);
            });

            it('should set the upper selectable value to 90', function () {
                // 100 isn't divisible by the step.
                assert(slider.model.maximum).equals(90);
            });
        }); // With selectable: [20, 40]

        describe('With value: 50', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: 50 });
            });

            it('should set the value to 50', function () {
                assert(slider.model.value).equals(50);
            });
        }); // With value: 50

        describe('With value: -1', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: -1 });
            });

            it('should set the value to 0', function () {
                assert(slider.model.value).equals(0);
            });
        }); // With value: -1

        describe('With value: 500', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { value: 500 });
            });

            it('should set the value to 100', function () {
                assert(slider.model.value).equals(100);
            });
        }); // With value: 500

        describe('With disable: true', function () {
            before(function () {
                slider = new $.Quinn(wrapper, { disable: true });
            });

            it('should disable the slider', function () {
                assert(slider.disabled).isTrue();
            });
        }); // With disable: true

        describe('With setup: ...', function () {
            var callbackRun;

            before(function () {
                callbackRun = false;

                slider = new $.Quinn(wrapper, {
                    setup: function () {
                        callbackRun = true;
                    }
                });
            });

            it('should run the callback function', function () {
                assert(callbackRun).isTrue();
            });
        }); // With setup: ...

    });

});
