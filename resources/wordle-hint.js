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
if (timeTravel.puzzles) {
    window.puzzles = mapPuzzles(puzzles);
}

if (window.puzzles) {
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
                window.puzzles = mapPuzzles(puzzles);
                getSuggestion(window.puzzles);
            }
        });
}

function mapPuzzles(puzzles) {
    return puzzles.map((word) => {
        return {
            name: word
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
    let magicNum = 200;
    let possibilities = puzzles.filter((puzzle) => isPossible(puzzle.name));

    let rankArr = getRankArr(puzzles);
    let possibleRankArr = getRankArr(possibilities);

    let eliminationLetters = [];
    let eliminationRankArr = [];
    let possibleEliminationRankArr = [];

    if (possibilities.length < magicNum && possibilities.length > 2) {
        eliminationLetters = getEliminationLetters(possibilities, present, correct);
        eliminationRankArr = getRankArr(puzzles, eliminationLetters);
        possibleEliminationRankArr = getRankArr(possibilities, eliminationLetters);
    }

    window.puzzles.forEach((puzzle) => {
        let thisIsPossible = isPossible(puzzle.name);
        Object.assign(puzzle, {
            isPossible: thisIsPossible,
            puzzleRank: getWordRank(rankArr, puzzle.name),
            possibleRank: thisIsPossible && getWordRank(possibleRankArr, puzzle.name),
            eliminationRank: !thisIsPossible && getWordRank(eliminationRankArr, puzzle.name),
            possibleEliminationRank: thisIsPossible && getWordRank(possibleEliminationRankArr, puzzle.name)
        });
    });

    window.puzzles
        .sort((a, b) => {
            return String([... new Set(b.name.split(''))].length).localeCompare([... new Set(a.name.split(''))].length, 'en', { numeric: true }) ||
                String(b.possibleEliminationRank).localeCompare(a.possibleEliminationRank, 'en', { numeric: true }) ||
                String(b.possibleRank).localeCompare(a.possibleRank, 'en', { numeric: true }) ||
                String(b.eliminationRank).localeCompare(a.eliminationRank, 'en', { numeric: true }) ||
                String(b.puzzleRank).localeCompare(a.puzzleRank, 'en', { numeric: true });
        });

    let best = window.puzzles.slice()
        .filter((puzzle) => puzzle.isPossible);

    let outputs = [
        [`Possibilities (${possibilities.length})`]
            .concat(best.slice(0, 5).map((puzzle) => { return `  ${puzzle.name}`; }))
            .join('\n')
            .trim(),
    ];

    let isSame = window.puzzles.slice(0,2).map((puzzle) => puzzle.name).join('') ===
        best.slice(0,2).map((puzzle) => puzzle.name).join('');

    if (!isSame && best.length > 2 && possibilities.length < magicNum) {
        outputs.push([`Elimination`]
            .concat(window.puzzles.slice(0, 2).map((puzzle) => { return `  ${puzzle.name}`; }))
            .join('\n')
            .trim()
        );
    }

    let output = outputs.filter(Boolean).join('\n---\n');
    console.log(output);
    alert(output);
}

function getRankArr(arr, filterArray) {
    let rankArr = new Array(5).fill('').map(() => {return {}; });
    arr.forEach((puzzle) => {
        puzzle.name.split('').forEach((letter, index) => {
            if (!filterArray || filterArray.includes(letter)) {
                rankArr[index][letter] ??= 0;
                rankArr[index][letter] ++;
            }
        });
    });
    return rankArr;
}

function getWordRank(rankArr, word) {
    if (!rankArr || !rankArr.length) {
        return 0;
    }

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

function getEliminationLetters(possibilities, present, correct) {
    let possibleLetters = [... new Set(possibilities
        .map((puzzle) => puzzle.name.toLowerCase().split(''))
        .flat())];
    let presentLetters = present.concat(correct)
        .filter((letter) => { return letter !== '.'; });

    [... new Set(presentLetters)].forEach((letter) => {
        possibleLetters.splice(possibleLetters.indexOf(letter.toLowerCase()), 1);
    });

    return possibleLetters;
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