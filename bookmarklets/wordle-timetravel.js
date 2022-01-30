javascript: (() => {
    fetch('https://raw.githubusercontent.com/j0be/Random-Scripts/master/resources/wordle-timetravel.js')
        .then(response => response.text())
        .then(result => {
            let timeTraveler = new Function(result);
            timeTraveler();
        });
})();