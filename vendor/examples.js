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
            replace(/\);\s*$/, '');

        if (code.length === 0) {
            return {};
        } else {
            // Yes, yes. I know.
            return eval('Object(' + code + ')');
        }
    }

    function determinePrecision (number) {
        if (_.isNumber(number)) {
            number = number.toString().split('.');
            return number[1] ? number[1].length : 0
        }

        return 0;
    }

    $('pre').each(function () {
        var $this = $(this),

            // Contains the <code> element from the example.
            code = $this.find('code'),

            // The options used by the $.fn.quinn call in the example.
            options = extractOptions(code),

            // The number of decimal places with which to format the
            // displayed value for this example.
            precision = determinePrecision(options.interval),

            // The main DOM node which will replace the pre element.
            exampleEl;

        exampleEl = $('<div class="example"></div>');

        exampleEl.append($('<div class="slider"></div>'));
        exampleEl.append($('<div class="value"></div>'));
        exampleEl.append($('<pre></pre>').append(
            $('<code class="language-javascript"></code>').html($this.html())
        ));

        $this.replaceWith(exampleEl);

        exampleEl.children('.slider').quinn(_.extend(options, {
            onChange: wrapCallback(options.onChange, exampleEl, precision),
            onSetup:  wrapCallback(options.onSetup,  exampleEl, precision)
        }));
    });

    // Do highlighting.
    hljs.initHighlightingOnLoad();

})(jQuery);
