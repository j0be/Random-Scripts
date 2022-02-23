/* Get available words */
let jsFile = document.location.origin +
    document.location.pathname.match(/.*\//)[0] +
    document.body.querySelector('[src*="main."]').getAttribute('src');

let timeTravel = window.timeTravel || {};
if (timeTravel.puzzles || window.puzzles) {
    getSuggestion(timeTravel.puzzles || window.puzzles);
} else {
    fetch(jsFile)
        .then(response => response.text())
        .then(result => {
            let puzzles = JSON.parse(result.match(/\[("[a-z]{5}", ?){3}.*?\]/g)?.[0]);
            if (puzzles && puzzles.length) {
                window.puzzles = puzzles;
                getSuggestion(puzzles);
            }
        });
}

function getSuggestion(puzzles) {
    let rows = document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelectorAll('game-row');
    let correct = new Array(5).fill('.');
    let present = [];
    let presentPositionExclude = new Array(5).fill('.');
    let absent = [];
    let absentPositionExclude = new Array(5).fill('.');

    rows.forEach((row) => {
        let tiles = Array.from(row.shadowRoot.querySelectorAll('game-tile'));
        /* Correct tiles */
        tiles.forEach((tile, index) => {
            if (tile.getAttribute('evaluation') === 'correct') {
                correct[index] = tile.getAttribute('letter');
            }
        });

        /* Present tiles */
        let rowPresent = [...new Set(tiles.map((tile, index) => {
            let evalulation = tile.getAttribute('evaluation');
            if (evalulation === 'present' || evalulation === 'absent') {
                let letter = tile.getAttribute('letter');
                let arr = evalulation === 'present' ? presentPositionExclude : absentPositionExclude;
                arr[index] = arr[index].pop ?
                    arr[index] : [];
                arr[index].push(letter);

                return evalulation === 'present' ? letter : '';
            } else {
                return '';
            }
        }).filter(letter => letter))];
        present = [...new Set(present.concat(rowPresent))];

        /* Absent tiles */
        let rowAbsent = [...new Set(tiles.filter((tile) => {
            return tile.getAttribute('evaluation') === 'absent' && tiles.filter((innerTile) => {
                return tile.getAttribute('letter') === innerTile.getAttribute('letter');
            }).length === 1;
        }).map((tile) => {
            return tile.getAttribute('letter');
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

    let possibilities = puzzles.filter((puzzle) => {
        let isCorrectMatch = !!puzzle.match(correctReg);
        let isPresentMatch = present.every((letter) => {
            return puzzle.includes(letter);
        });
        let isPresentPosition = !!puzzle.match(presentReg);
        let isAbsentMatch = !puzzle.match(absentReg);

        return isCorrectMatch && isPresentMatch && isPresentPosition && !isAbsentMatch;
    });

    let rankArr = getRankArr(puzzles);
    let possibleRankArr = getRankArr(possibilities);
    let inclStr = possibilities
        .sort((a, b) => {
            let aNum = getWordRank(rankArr, a);
            let bNum = getWordRank(rankArr, b);
            return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
        })
        .sort((a, b) => {
            let aNum = getWordRank(possibleRankArr, a);
            let bNum = getWordRank(possibleRankArr, b);
            return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
        })
        .slice(0, 10)
        .join('\n').trim();

    let output = [inclStr].map((str, index) => {
        if (index && possibilities.length <= 3) {
            return;
        }

        if (str) {
            let map = [
                `Possible (${possibilities.length})\n  `,
                `Exclusion Sort\n  `
            ];
            return map[index] + str.replace(/\n/g, '\n  ');
        }
    });

    alert(output.filter(Boolean).join('\n---\n').replace(new RegExp(document.querySelector('game-app').solution, 'g'), '* ' + document.querySelector('game-app').solution));
}

function getRankArr(arr) {
    let rankArr = new Array(5).fill('').map(() => {return {}; });
    arr.forEach((word) => {
        word.split('').forEach((letter, index) => {
            rankArr[index][letter] ??= 0;
            rankArr[index][letter] ++;
        });
    });
    return rankArr;
}

function getWordRank(rankArr, word) {
    return word.split('').map((letter, index) => {
        return rankArr[index][letter] || 0;
    }).reduce((partialSum, curSum) => partialSum + curSum, 0);
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
    let isButton = event.path.some((node) => {
        return node.getAttribute('class') === 'title';
    });

    if (isButton && !document.querySelector('game-app').boardState[document.querySelector('game-app').rowIndex]) {
        event.preventDefault();
        getSuggestion(timeTravel.puzzles || window.puzzles);
    }
}

document.body.addEventListener('click', clickHandler);