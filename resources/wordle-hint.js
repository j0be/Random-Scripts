/* Get available words */
let jsFile = document.location.origin +
    (document.location.pathname.match(/.*\//)[0] +
    document.querySelector('[src*="main."]').getAttribute('src')).replace(/\/+/g,'/');
let isUnlimited = document.location.origin.match(/unlimited/i);
let timeTravel = window.timeTravel || {};
if (timeTravel.puzzles || window.puzzles) {
    getSuggestion(timeTravel.puzzles || window.puzzles);
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
            let evalulation = tile.getAttribute('evaluation');
            let isPresent = evalulation === 'present' ||
                Array.from(tile.classList).includes('letter-elsewhere');
            let isAbsent = evalulation === 'absent' ||
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

    let possibilities = puzzles.filter((puzzle) => {
        let isCorrectMatch = !!puzzle.match(correctReg);
        let isPresentMatch = present.every((letter) => {
            return puzzle.includes(letter.toLowerCase());
        });
        let isPresentPosition = !!puzzle.match(presentReg);
        let isAbsentMatch = !puzzle.match(absentReg);

        return isCorrectMatch && isPresentMatch && isPresentPosition && !isAbsentMatch;
    });

    let rankArr = getRankArr(puzzles);
    let possibleRankArr = getRankArr(possibilities);
    let best = possibilities
        .sort((a, b) => {
            let aNum = getWordRank(rankArr, a);
            let bNum = getWordRank(rankArr, b);
            return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
        })
        .sort((a, b) => {
            let aNum = getWordRank(possibleRankArr, a);
            let bNum = getWordRank(possibleRankArr, b);
            return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
        });
    let inclStr = best
        .slice(0, 5)
        .join('\n').trim();

    let midStr = [... new Set(sortFromMid(best))]
        .slice(0, 2)
        .join('\n').trim();

    let outputArr = best.length > 5 ?
        [inclStr, midStr] :
        [inclStr];

    let output = outputArr.map((str, index) => {
        if (index && possibilities.length <= 3) {
            return;
        }

        if (str) {
            let map = [
                `Common Sort (${possibilities.length})\n  `,
                `Mid Sort\n  `
            ];
            return map[index] + str.replace(/\n/g, '\n  ');
        }
    });

    let solution = isUnlimited ? 'foobar' : document.querySelector('game-app').solution;
    alert(output.filter(Boolean).join('\n---\n').replace(new RegExp(solution, 'g'), '* ' + solution));
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

let title = isUnlimited ?
    document.querySelector('h1') :
    document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelector('.title');

title.style = 'color: white; text-decoration: none; pointer-events: all;';
document.body.addEventListener('click', clickHandler);