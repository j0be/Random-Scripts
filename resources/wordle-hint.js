/* Get available words */
let jsFile = document.location.origin +
    (document.location.pathname.match(/.*\//)[0] +
    document.querySelector('[src*="main."]').getAttribute('src')).replace(/\/+/g,'/');
let isUnlimited = document.location.origin.match(/unlimited/i);

if (!window.puzzles) {
    let title = isUnlimited ?
        document.querySelector('h1') :
        document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelector('.title');

    title.style = 'color: white; text-decoration: none; pointer-events: all;';
    document.body.addEventListener('click', clickHandler);
}

let timeTravel = window.timeTravel || {};
if (timeTravel.puzzles || window.puzzles) {
    window.puzzles = window.puzzles || timeTravel.puzzles;
    getSuggestion(window.puzzles);
} else {
    fetch(jsFile)
        .then(response => response.text())
        .then(result => {
            let puzzles = JSON.parse(result.match(/\[("[a-z]{5}", ?){3}.*?\]/g)?.[0]);
            if (isUnlimited) {
                let length = document.querySelector('.RowL').childNodes.length;
                puzzles = JSON.parse(result.match(/\('(\["\w{1,12}",.*?\])/)?.[1]).filter((word) => {
                    return word.length === length;
                });
            }

            if (puzzles && puzzles.length) {
                window.puzzles = puzzles;
                getSuggestion(puzzles);
            }
        });
}

function getSuggestion(puzzles) {
    let rows = isUnlimited ?
        document.querySelectorAll('.RowL') :
        document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelectorAll('game-row');

    let correct = new Array(5).fill('.');
    let present = [];
    let presentPositionExclude = new Array(5).fill('.');
    let absent = [];
    let absentPositionExclude = new Array(5).fill('.');

    rows.forEach((row) => {
        let tiles = isUnlimited ?
            Array.from(row.querySelectorAll('.RowL-letter')) :
            Array.from(row.shadowRoot.querySelectorAll('game-tile'));
        /* Correct tiles */
        tiles.forEach((tile, index) => {
            let isCorrect = tile.getAttribute('evaluation') === 'correct' ||
                Array.from(tile.classList).includes('letter-correct');

            if (isCorrect) {
                correct[index] = tile.getAttribute('letter') || tile.innerText.trim();
            }
        });

        /* Present tiles */
        let rowPresent = [...new Set(tiles.map((tile, index) => {
            let evaluation = tile.getAttribute('evaluation');
            let isPresent = evaluation === 'present' ||
                Array.from(tile.classList).includes('letter-elsewhere');
            let isAbsent = evaluation === 'absent' ||
                Array.from(tile.classList).includes('letter-absent');
            if (isPresent || isAbsent) {
                let letter = tile.getAttribute('letter') || tile.innerText.trim();
                let arr = isPresent ? presentPositionExclude : absentPositionExclude;
                arr[index] = arr[index].pop ?
                    arr[index] : [];
                arr[index].push(letter);

                return isPresent ? letter : '';
            } else {
                return '';
            }
        }).filter(letter => letter))];
        present = [...new Set(present.concat(rowPresent))];

        /* Absent tiles */
        let rowAbsent = [...new Set(tiles.filter((tile) => {
            let isAbsent = tile.getAttribute('evaluation') === 'absent' ||
                Array.from(tile.classList).includes('letter-absent');
            return isAbsent && tiles.filter((innerTile) => {
                let a = tile.getAttribute('letter') || tile.innerText.trim();
                let b = innerTile.getAttribute('letter') || innerTile.innerText.trim();
                return a === b;
            }).length === 1;
        }).map((tile) => {
            return tile.getAttribute('letter') || tile.innerText.trim();;
        }))];
        absent = [...new Set(absent.concat(rowAbsent))];
    });

    /* Covert to regex */
    let correctReg = new RegExp('^' + correct.join('') + '$', 'i');
    let presentReg = new RegExp('^' + presentPositionExclude.map((item) => {
        if (item.pop) {
            return `[^${item.join('')}]`;
        }
        return item;
    }).join('') + '$', 'i');
    let absentReg = new RegExp('^' + absentPositionExclude.map((item) => {
        if (item.pop) {
            return `[^${[...new Set(item.concat(absent))].sort().join('')}]`;
        }
        return `[^${absent.join('')}]`;
    }).join('') + '$', 'i');

    function isPossible(puzzle) {
        let isCorrectMatch = !!puzzle.match(correctReg);
        let isPresentMatch = present.every((letter) => {
            return puzzle.includes(letter.toLowerCase());
        });
        let isPresentPosition = !!puzzle.match(presentReg);
        let isAbsentMatch = !puzzle.match(absentReg);

        return isCorrectMatch && isPresentMatch && isPresentPosition && !isAbsentMatch;
    }

    /**** START ARRAY BUILDING */
    let possibilities = puzzles.filter((puzzle) => isPossible(puzzle));
    let eliminationLetters = getEliminationLetters();

    let rankArr = getRankArr(puzzles);
    let possibleRankArr = getRankArr(possibilities);
    let eliminationRankArr = getRankArr(puzzles, eliminationLetters);
    let possibleEliminationRankArr = getRankArr(possibilities, eliminationLetters);

    let puzzleMapping = puzzles.map((word) => { return {
        name: word,
        isPossible: isPossible(word),
        puzzleRank: getWordRank(rankArr, word),
        possibleRank: getWordRank(possibleRankArr, word),
        eliminationRank: getWordRank(eliminationRankArr, word),
        possibleEliminationRank: getWordRank(possibleEliminationRankArr, word)
    }});

    let best = puzzleMapping.slice()
        .filter((puzzle) => puzzle.isPossible)
        .sort((a, b) => String(b.puzzleRank).localeCompare(a.puzzleRank, 'en', { numeric: true }))
        .sort((a, b) => String(b.possibleRank).localeCompare(a.possibleRank, 'en', { numeric: true }))
        .sort((a, b) => String(b.possibleEliminationRank).localeCompare(a.possibleEliminationRank, 'en', { numeric: true }))
        .sort((a, b) => String([... new Set(b.name.split(''))].length).localeCompare([... new Set(a.name.split(''))].length, 'en', { numeric: true }));

    let elimination = best.slice()
        .sort((a, b) => String(b.eliminationRank).localeCompare(a.eliminationRank, 'en', { numeric: true }));

    let outputs = [
        [`Possibilities (${possibilities.length})`]
            .concat(best.slice(0, 5).map((puzzle) => { return `  ${puzzle.name}`; }))
            .join('\n')
            .trim(),
        [`Elimination`]
            .concat(elimination.slice(0, 2).map((puzzle) => { return `  ${puzzle.name}`; }))
            .join('\n')
            .trim()
    ];

    let output = outputs.filter(Boolean).join('\n---\n');
    let solution = isUnlimited ? 'foobar' : document.querySelector('game-app').solution;

    alert(output.replace(new RegExp(solution, 'g'), '* ' + solution));
}

function getRankArr(arr, filterArray) {
    let rankArr = new Array(5).fill('').map(() => {return {}; });
    arr.forEach((word) => {
        word.split('').forEach((letter, index) => {
            if (!filterArray || filterArray.includes(letter)) {
                rankArr[index][letter] ??= 0;
                rankArr[index][letter] ++;
            }
        });
    });
    return rankArr;
}

function getWordRank(rankArr, word) {
    let slotRank = word.split('').map((letter, index) => {
        return (rankArr[index][letter] / word.match(new RegExp(letter, 'gi'))?.length) || 0;
    }).reduce((partialSum, curSum) => partialSum + curSum, 0);

    let letterRank = [... new Set(word.split(''))].map((letter) => {
        return rankArr.reduce((partialSum, rankSlot) => {
            return (rankSlot[letter] || 0) + partialSum;
        }, 0);
    }).reduce((partialSum, curSum) => partialSum + curSum, 0);

    return slotRank + ((letterRank / 5) / 2);
}

function getEliminationLetters() {
    return isUnlimited ?
        Array.from(document.querySelectorAll(`.Game-keyboard-button:not(.Game-keyboard-button-wide, .letter-elsewhere, .letter-correct, .letter-absent)`))
            .map((node) => node.innerText.trim().toLowerCase()) :
        [];
}

function sortFromMid(arr) {
    let res = [];
    for (let i = Math.ceil(arr.length / 2); i >= 0; i--) {
        res.push(arr[i]);
        res.push(arr[arr.length - i + 1])
    }
    return res.filter(x => x !== undefined);
}

function clickHandler(event) {
    let isButton = isUnlimited ?
        event.path.some((node) => {
            return node.tagName === 'H1';
        }) :
        event.path.some((node) => {
            return node && node.getAttribute && node.getAttribute('class') === 'title';
        });

    if (isButton) {
        event.preventDefault();
        getSuggestion(timeTravel.puzzles || window.puzzles);
    }
}