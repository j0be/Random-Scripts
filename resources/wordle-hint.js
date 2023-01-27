window.hinter = {
  state: {
    ...window.hinter?.state,
    game: 'wordle',
    get: () => {
      let domMapper = hinter.tiles.getDom();
      return domMapper.map(row => ({
        ...row,
        ...(() => {
          let statusId = hinter.rows.status(row);
          return {
            statusId,
            status: hinter.constants.states.row[statusId],
          };
        })(),
        tiles: row.tiles.map(tile => {
          return {
            ...tile,
            ...(() => {
              let statusId = hinter.tiles.status(tile);
              return {
                statusId,
                status: hinter.constants.states.tile[hinter.tiles.status(tile)],
              };
            })(),
            letter: hinter.tiles.letter(tile).toLowerCase(),
          };
        })
      }));
    },
  },

  constants: {
    states: {
      tile: ['empty', 'tbd', 'absent', 'present', 'correct'],
      row: ['empty', 'pending', 'played']
    }
  },

  init: () => {
    return hinter.words.get()
      .then((dict) => { console.log(`Dictionary with ${dict && dict.length} words obtained.`); return dict; })
      .then((dict) => {
        let rows = hinter.state.get();
        hinter.words.hint(dict, rows);
      })
      .catch(err => {
        debugger;
        console.error('General Stack Error', err);
        alert(`General Stack Error:\n${err.toString()}`);
      });
  },

  words: {
    get: () => {
      if (hinter.state.dict) {
        return Promise.resolve(hinter.state.dict);
      }

      let dictMapper = {
        default: () => Promise.reject('fail'),
        wordle: () => {
          return fetch('./index.html')
            .then(response => response.text())
            .then(htmlData => {
              let sourceFile = htmlData.match(/wordle\.[\w\d]+\.js/i)?.[0];
              return fetch(`../../games-assets/v2/${sourceFile}`)
                .then(response => response.text())
                .then(jsData => {
                  hinter.state.dict = JSON.parse(jsData.match(/SET_INITIAL_STATE.*?(\[.*?\])/i)[1]);
                  return hinter.state.dict;
                });
            })
        }
      };

      return (dictMapper[hinter.state.game] || dictMapper.default)();
    },
    hint: (dict, rows) => {
      const {possibilities, exactArr} = hinter.words.possible(dict, rows);
      let commonSort = hinter.words.sort.common(dict, possibilities, exactArr);
      let output = [
        `Possibilities: ${possibilities.length}`,
        commonSort
      ];
      console.log(output);

      alert(output.map(item => {
        return typeof item === 'string'
          ? item
          : item.slice(0,10).map(word => `${word.possibleScore}: ${word.word}`).join('\n') + '\n';
      }).join('\n').trim());
    },
    possible: (dict, rows) => {
      let wordLength = rows[0].tiles.length;
      let playedRows = rows.filter(row => row.status === 'played');

      let exactArr = Array(wordLength).fill('');
      let excludeArr = Array(wordLength).fill('');
      let cards = ((output) => {
        playedRows.forEach((row, i, array, rowOutput = {}) => {
          row.tiles.forEach((tile, tileIndex) => {
            rowOutput[tile.letter] = (rowOutput[tile.letter] ?? 0) +
              (tile.statusId >= 3 ? 1 : 0);

            if (tile.status === 'correct') {
              exactArr[tileIndex] = tile.letter;
            }

            if (tile.status === 'present') {
              excludeArr[tileIndex] += tile.letter;
            }
          });
          Object.keys(rowOutput).forEach(letter => {
            output[letter] = Math.max(
              (output[letter] ?? 0),
              rowOutput[letter]
            );
          });
        });
        return output;
      })({});

      let exactReg = new RegExp(`^${exactArr.map(letter => letter || '.{1}').join('')}$`, 'i');
      let excludeReg = new RegExp(`^${excludeArr.map(letter => `[^${letter}]` || `[${excludeArr.join('')}]{1}`).join('')}$`, 'i');
      return {
        possibilities: dict
          .filter(word => word.match(exactReg))
          .filter(word => word.match(excludeReg))
          .filter(word => Object.keys(cards).every(letter => {
            return cards[letter] // if there are *some* of this letter
              ? (word.match(new RegExp(letter, 'gi'))?.length ?? 0) >= cards[letter]
              : !word.match(letter);
          })),
        exactArr
      };
    },
    sort: {
      common: (dict, possibilities, exactArr) => {
        const [allDistribution, possibleDistribution] = [dict, possibilities]
          .map(words => {
            return Array(words[0].length)
              .fill('').map(() => { return {}; })
              .map((slot, i) => {
                possibilities.forEach(possibility => {
                  slot[possibility[i]] = (slot[possibility[i]] ?? 0) + 1;
                })
                return slot;
              });
          });

        let score = (distribution, word) => {
          return word.split('').reduce((accumulator, letter, i) => {
            let distributionScore = (distribution[i][letter] ?? 0);
            let letterCount = word.match(new RegExp(letter,'g')).length;
            return accumulator +
              (letter === exactArr[i]
                ? 0
                : (distributionScore / letterCount)
              );
          }, 0)
        };

        return possibilities
          .map(word => {
            return {
              word,
              possibleScore: score(possibleDistribution, word),
              allScore: score(allDistribution, word)
            };
          })
          .sort((a, b) => String(b.allScore).localeCompare(String(a.allScore), 'en', { numeric: true }))
          .sort((a, b) => String(b.possibleScore).localeCompare(String(a.possibleScore), 'en', { numeric: true }));
      }
    }
  },

  util: {
    resolveMapper: (mapper, ...args) => {
      if (mapper.hasOwnProperty(hinter.state.game)) {
        return mapper[hinter.state.game](...args);
      }

      let keys = Object.keys(mapper);
      for (let i = 0; i < keys.length; i++) {
        let output = mapper[keys[i]](...args);
        if (!isNaN(output) || output) {
          return output;
        }
      }
    },
  },

  rows: {
    getDom: () => {
      return hinter.util.resolveMapper({
        wordle: () => {
          return Array.from(document.querySelectorAll('[role="group"]'))
            .filter(node => node.className.match('row'));
        }
      });
    },
    status: (statusRow) => {
      return hinter.util.resolveMapper({
        wordle: (wordleRow) => {
          return [
            (row) => !Boolean(row.node.innerText),
            (row) => row.node.querySelector('[data-state="empty"]'),
            () => { return true; }
          ].findIndex(mapper => Boolean(mapper(wordleRow)));
        }
      }, statusRow);
    }
  },
  tiles: {
    getDom: () => {
      return hinter.util.resolveMapper({
        wordle: () => {
          return hinter.rows.getDom()
            ?.map(rowNode => {
              return {
                node: rowNode,
                tiles: Array.from(rowNode.children).map(tile => {
                  return {
                    node: tile
                  };
                })
              };
            });
        }
      });
    },
    status: (statusTile) => {
      return hinter.util.resolveMapper({
        wordle: (wordleTile) => {
          let tileState = wordleTile.node.querySelector('[data-state]').dataset.state;
          return [
            'empty',
            'tbd',
            'absent',
            'present',
            'correct',
          ].indexOf(tileState);
        }
      }, statusTile);
    },
    letter: (statusTile) => {
      return hinter.util.resolveMapper({
        wordle: (wordleTile) => {
          return wordleTile.node.innerText.trim();
        }
      }, statusTile);
    }
  },
};


hinter.init();
debugger;
