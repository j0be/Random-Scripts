window.timeMachine = {
    promises: [],
    setup: () => {
        /* Get Data */
        let jsFileName = document.body.querySelector('[src*="main."]').getAttribute('src');
        let jsPromise = fetch(`${document.location.origin}${document.location.pathname.match(/.*\//)[0]}${jsFileName}`)
            .then(response => response.text())
            .then(result => {
                let puzzles = JSON.parse(result.match(/\[("[a-z]{5}", ?){3}.*?\]/g)?.[0]);
                if (puzzles) {
                    timeMachine.puzzles = puzzles;
                }
            });
        timeMachine.promises.push(jsPromise);

        /* Wait until standard load */
        timeMachine.promises.push(new Promise((resolve, reject) => {
            let connector = setInterval(() => {
                if (document.querySelector('game-app') && !isNaN(document.querySelector('game-app').dayOffset)) {
                    resolve();
                    clearInterval(connector);
                }
            }, 50);
        }));

        Promise.all(timeMachine.promises).then(() => {
            let params = (new URL(document.location)).searchParams;
            let day = params.get('day') ?? document.querySelector('game-app').dayOffset;
            timeMachine.day = day;
            setTimeout(() => {
                if (document.querySelector('game-app')) {
                    document.querySelector('game-app').dayOffset = day;
                }
            }, 100);

            window.rollingBackup = setInterval(() => {
                timeMachine.backup();
            }, 500);

            if (document.querySelector('game-app').solution !== timeMachine.puzzles[day]) {
                let index = timeMachine.puzzles.indexOf(document.querySelector('game-app').solution);
                timeMachine.getDay(index || day);
            }

            timeMachine.appendButtons();
            timeMachine.addListeners();
        });
    },
    reset: (day) => {
        timeMachine.day = day;
        window.rollingBackup && clearInterval(window.rollingBackup);
        timeMachine.rebuildStats();

        let jsFileName = document.body.querySelector('[src*="main."]')?.getAttribute('src');
        document.body.querySelector('[src*="main."]')?.remove();
        document.body.querySelector('game-app')?.remove();

        window.wordle = {};
        window.wordle.hash = 'bd4cb59c';

        let script = document.createElement('script');
        script.src = jsFileName;
        script.onload = () => {
            let game = document.createElement('game-app');
            document.body.appendChild(game);
            if (day) {
                setTimeout(() => {
                    document.querySelector('game-app').dayOffset = timeMachine.day;
                    document.querySelector('game-app').solution = timeMachine.puzzles[timeMachine.day];
                    timeMachine.appendButtons();
                    window.rollingBackup = setInterval(() => {
                        timeMachine.backup();
                    }, 500);
                }, 0);
            }
        };
        document.body.style = `background-color: ${window.getComputedStyle(document.body).backgroundColor}`;
        document.body.classList.remove('nightmode');
        document.body.appendChild(script);
    },

    rebuildStats: () => {
        let object = {
            currentStreak: 0,
            maxStreak: 0,
            guesses: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                fail: 0
            },
            winPercentage: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            averageGuesses: 0
        };
        for (let i = 0; i <= timeMachine.maxOffset; i++) {
            let existingDay = JSON.parse(window.localStorage.getItem(`gameState_${i}`));
            if (existingDay) {
                if (existingDay.gameStatus === 'FAIL') {
                    object.guesses.fail ++;
                    object.gamesPlayed ++;
                    object.currentStreak = 0;
                } else if (existingDay.gameStatus === 'WIN') {
                    object.guesses[existingDay.rowIndex] ++;
                    object.gamesWon ++;
                    object.gamesPlayed ++;
                    object.currentStreak ++;
                    object.maxStreak = Math.max(object.maxStreak, object.currentStreak);
                }
            } else {
                object.currentStreak = 0;
            }
        }

        object.winPercentage = Math.floor(100 * object.gamesWon / object.gamesPlayed);
        object.averageGuesses = Number((Object.keys(object.guesses).map((key) => {
            let num = Number(key === 'fail' ? 7 : key);
            return object.guesses[key] * num;
        }).reduce((partialSum, a) => partialSum + a, 0) / object.gamesPlayed).toFixed(2));
        window.localStorage.setItem('statistics', JSON.stringify(object));
    },

    getDay: (day) => {
        let existingDay = JSON.parse(window.localStorage.getItem(`gameState_${day}`));
        if (existingDay && existingDay.solution === timeMachine.puzzles[day]) {
            existingDay.lastPlayedTs = Date.now();
            window.localStorage.setItem('nyt-wordle-state', JSON.stringify(existingDay));
        } else if (timeMachine.puzzles && timeMachine.puzzles[day]) {
            let gameState = Object.assign(JSON.parse(window.localStorage.getItem('nyt-wordle-state')) || {}, {
                boardState: ['', '', '', '', '', ''],
                evaluations: [null, null, null, null, null, null],
                rowIndex: 0,
                gameStatus: 'IN_PROGRESS',
                solution: timeMachine.puzzles[day],
                lastPlayedTs: Date.now(),
                hardMode: document.querySelector('game-app').hardMode
            });
            window.localStorage.setItem('nyt-wordle-state', JSON.stringify(gameState));
            window.localStorage.setItem(`gameState_${day}`, JSON.stringify(gameState));
        }

        // let loc = (new URL(document.location));
        // loc.searchParams.set('day', day);
        // history.replaceState({}, '', loc);
        timeMachine.reset(day);
    },

    appendButtons: function appendButtons() {
        if (document.querySelector('game-app')) {
            let day = Number(timeMachine.day);
            let header = document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelector('header');
            header.style = 'flex-wrap: wrap; height: auto; align-itmes: center;';
            let menu = document.querySelector('#timeMachine') || document.createElement('div');
            menu.id = 'timeMachine';
            menu.style = 'flex-basis: 100%; display: flex; justify-content: space-between; align-items: center;';
            let title = document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelector('.title');
            title.setAttribute('href', document.location.pathname);
            title.style = 'color: white; text-decoration: none; pointer-events: all;';
            title.outerHTML = title.outerHTML.replace(/div/gi, 'a');

            let mapper = [
                { text: '&#171;', day: 0, filter: 0 },
                { text: '&#8249;', day: '-', filter: 0 },
                { text: timeMachine.day },
                { text: '&#8250;', day: '+', filter: timeMachine.maxOffset },
                { text: '&#187;', day: timeMachine.maxOffset, filter: timeMachine.maxOffset }
            ];
            mapper.forEach((item) => {
                if (item.hasOwnProperty('filter')) {
                    let button = document.createElement('button');
                    button.setAttribute('class', 'icon timeTravel');
                    button.innerHTML = item.text;
                    button.setAttribute('style', 'color: var(--color-tone-1); font-size: 2rem;');
                    button.addEventListener('click', timeMachine.click);
                    button.setAttribute('data-day', item.day);
                    if (day === item.filter) {
                        button.setAttribute('style', 'opacity: .5; color: var(--color-tone-3); font-size: 2rem; pointer-events: none;');
                        button.setAttribute('disabled', true);
                    }
                    menu.appendChild(button);
                } else {
                    let div = document.createElement('div');
                    div.setAttribute('class', 'timeTravel');
                    div.innerHTML = `<span style="padding: 0 1em;">${item.text}</span>`;
                    div.style = 'flex-basis: 100%; text-align: center;';
                    div.childNodes[0].addEventListener('click', timeMachine.prompt);
                    menu.appendChild(div);
                }
            });

            if (!header.querySelector('#timeMachine')) {
                header.appendChild(menu);
            }
            let root = document.documentElement;
            root.style.setProperty('--header-height', header.offsetHeight + "px");
        } else {
            setTimeout(timeMachine.appendButtons, 50);
        }
    },
    addListeners: function addListeners() {
        /* Some QOL keyboard functionality */
        document.body.addEventListener('keyup', timeMachine.closeDialog);
        document.body.addEventListener('keyup', timeMachine.keyNavigate);
    },

    closeDialog: function closeDialog(event) {
        if (event.keyCode === 27) {
            document.querySelector('game-app')
                .shadowRoot.querySelector('game-theme-manager')
                .querySelector('game-modal')
                .shadowRoot.querySelector('game-icon')
                .click();
        }
    },
    keyNavigate: function keyNavigate(event) {
        if (event.keyCode === 37) { /* Left arrow */
            document.querySelector('game-app')
                .shadowRoot.querySelector('game-theme-manager')
                .querySelector('#timeMachine')
                .querySelector(`button:nth-child(${event.shiftKey ? '1' : '2' })`)
                .click();
        }
        if (event.keyCode === 39) { /* Right arrow */
            document.querySelector('game-app')
                .shadowRoot.querySelector('game-theme-manager')
                .querySelector('#timeMachine')
                .querySelector(`button:nth-child(${event.shiftKey ? '5' : '4' })`)
                .click();
        }
    },

    backup: () => {
        let day = document.querySelector('game-app').dayOffset;
        let gameState = window.localStorage.getItem('nyt-wordle-state');
        if (gameState) {
            window.localStorage.setItem(`gameState_${day}`, gameState);
        }
    },
    click: (event) => {
        let mapper = {
            '-' : Number(document.querySelector('game-app').dayOffset) - 1,
            '+' : Number(document.querySelector('game-app').dayOffset) + 1
        };
        let day = event.target.dataset.day;
        if (isNaN(day)) {
            day = mapper[day];
        }
        timeMachine.getDay(day);
    },
    prompt: () => {
        let message = 'What day would you like to jump to?';
        let currentDay = timeMachine.day;
        let day = prompt(message, currentDay);
        while (day.trim().match(/\D/) || Number(day) < 0 || Number(day) > timeMachine.maxOffset) {
            alert(Number(day) > timeMachine.maxOffset ?
                    `Please enter a day less than ${timeMachine.maxOffset}` :
                    'Please enter a valid day');
            day = prompt(message, currentDay);
        }
        if (day !== currentDay) {
            timeMachine.getDay(day);
        }
    }
};

let date1 = new Date('06/19/2021');
let date2 = new Date();
let offset = Math.floor((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
timeMachine.maxOffset = offset;

window.customElements.originalDefine = window.customElements.define;
window.customElements.define = (key, value) => {
    if (!customElements.get(key)) {
        window.customElements.originalDefine(key, value);
    }
};
timeMachine.setup();
