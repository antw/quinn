(function ($) {

    function wrapCallback (cb, element, precision) {
        return function (newValue, slider) {
            if (_.isFunction(cb) && cb(newValue, slider) === false) {
                return false;
            }

            element.children('.value').text(newValue.toFixed(precision));
        };
    }

    function extractOptions (element) {
        var code = element.text().
            // replace(/^\$\('\.slider'/, 'el.children(".slider"').
            replace(/\$\('\.slider'\)\.quinn\(/, '').
            replace(/\);$/, '');

        // Yes, yes. I know.
        return eval('Object(' + code + ')');
    }

    function determinePrecision (number) {
        if (_.isNumber(number)) {
            number = number.toString().split('.');
            return number[1] ? number[1].length : 0
        }

        return 0;
    }

    $('.example').each(function () {
        var $this = $(this),

            // Contains the <code> element from the example.
            code = $this.find('code'),

            // The options used by the $.fn.quinn call in the example.
            options = extractOptions(code),

            // The number of decimal places with which to format the
            // displayed value for this example.
            precision = determinePrecision(options.interval);

        $this.prepend($('<div class="value"></div>'));
        $this.prepend($('<div class="slider"></div>'));

        // For syntax highlighting.
        code.addClass('language-javascript');

        $this.children('.slider').quinn(_.extend(options, {
            onChange: wrapCallback(options.onChange, $this, precision),
            onSetup:  wrapCallback(options.onSetup,  $this, precision)
        }));
    });

    // Do highlighting.
    hljs.initHighlightingOnLoad();

})(jQuery);
