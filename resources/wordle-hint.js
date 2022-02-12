let correct = new Array(5).fill('.');
let present = [];
let presentPositionExclude = new Array(5).fill('.');
let absent = [];
let rows = document.querySelector('game-app').shadowRoot.querySelector('game-theme-manager').querySelectorAll('game-row');
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
        if (tile.getAttribute('evaluation') === 'present') {
            let letter = tile.getAttribute('letter');
            presentPositionExclude[index] = presentPositionExclude[index].pop ?
                presentPositionExclude[index] : [];
            presentPositionExclude[index].push(letter);
            return letter;
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
let absentReg = new RegExp('[' + absent.join('') + ']', 'i');

/* Get available words */
let jsFile = document.location.origin +
    document.location.pathname.match(/.*\//)[0] +
    document.body.querySelector('[src*="main."]').getAttribute('src');

fetch(jsFile)
    .then(response => response.text())
    .then(result => {
        let puzzles = JSON.parse(result.match(/\[("[a-z]{5}", ?){3}.*?\]/g)?.[0]);
        if (puzzles && puzzles.length) {
            let possibilities = puzzles.filter((puzzle) => {
                let isCorrectMatch = !!puzzle.match(correctReg);
                let isPresentMatch = present.every((letter) => {
                    return puzzle.includes(letter);
                });
                let isPresentPosition = !!puzzle.match(presentReg);
                let isAbsentMatch = absent.length && !!puzzle.match(absentReg);

                return isCorrectMatch && isPresentMatch && isPresentPosition && !isAbsentMatch;
            });

            let correctExclusionReg = new RegExp(`[${correct.join('').replace(/\./g,'')}]`);
            let exclusions = puzzles.filter((puzzle) => {
                let isAbsentMatch = absent.length && !!puzzle.match(absentReg);
                let hasCorrect = !!puzzle.match(correctExclusionReg);
                let isPresentMatch = present.every((letter) => {
                    return puzzle.includes(letter);
                });

                return !isPresentMatch && !isAbsentMatch && !hasCorrect;
            });

            let rankObj = {};
            possibilities.forEach((word) => {
                [... new Set(word.split(''))].forEach((letter) => {
                    rankObj[letter] ??= 0;
                    rankObj[letter] ++;
                });
            });
            let rank = Object.keys(rankObj).sort((a,b) => {
                return rankObj[a] > rankObj[b] ? -1 : rankObj[a] < rankObj[b] ? 1 : 0;
            });
            let midRank = sortFromMid(rank.reverse()).reverse();

            let exclStr = (possibilities.length < 5 || !exclusions.length ? possibilities : exclusions)
                .sort((a, b) => {
                    let aNum = [...new Set(a.split(''))].map((letter) => { return midRank.indexOf(letter); }).reduce((partialSum, curSum) => partialSum + curSum, 0);
                    let bNum = [...new Set(b.split(''))].map((letter) => { return midRank.indexOf(letter); }).reduce((partialSum, curSum) => partialSum + curSum, 0);
                    return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
                })
                .sort((a, b) => { return [...new Set(b.split(''))].length - [...new Set(a.split(''))].length; })
                .slice(0, 5)
                .join('\n').trim();

            let rankRev = rank.reverse();
            let inclStr = possibilities
                .sort((a, b) => {
                    let aNum = [...new Set(a.split(''))].map((letter) => { return rankRev.indexOf(letter); }).reduce((partialSum, curSum) => partialSum + curSum, 0);
                    let bNum = [...new Set(b.split(''))].map((letter) => { return rankRev.indexOf(letter); }).reduce((partialSum, curSum) => partialSum + curSum, 0);
                    return aNum > bNum ? 1 : aNum < bNum ? -1 : 0;
                })
                .sort((a, b) => { return [...new Set(b.split(''))].length - [...new Set(a.split(''))].length; })
                .slice(0, 5)
                .join('\n').trim();

            let output = [inclStr, exclStr].map((str, index) => {
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
            if (possibilities.length <= exclusions.length && possibilities.length !== 1) {
                output.reverse();
            }

            alert(output.filter(Boolean).join('\n---\n').replace(new RegExp(document.querySelector('game-app').solution, 'g'), '* ' + document.querySelector('game-app').solution));
        }
    });

function sortFromMid(arr) {
    let res = [];
    for (let i = Math.ceil(arr.length / 2); i >= 0; i--) {
        res.push(arr[i]);
        res.push(arr[arr.length - i + 1])
    }
    return res.filter(x => x !== undefined);
}
