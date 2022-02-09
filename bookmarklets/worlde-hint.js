javascript: (() => {
    fetch('https://raw.githubusercontent.com/j0be/Random-Scripts/master/resources/wordle-hint.js')
        .then(response => response.text())
        .then(result => {
            let hint = new Function(result);
            hint();
        });
})();