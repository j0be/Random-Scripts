const [ CORRECT, PRESENT, ABSENT ] = [ 'correct', 'present', 'absent' ];
  const init = () => {
    const site = getSiteName();
    return Promise.all([
      getDictionary(site),
      getBoard(site),
      getSolution(site),
    ]).then(([dictionary, board, solution]) => {
      if (!dictionary) {
        throw new Error('No dictionary found. Do we support this site?');
      }

      return new Promise((resolve) => {
        const summary = getBoardSummary(board);
        const regex = getRegex(summary);

        return resolve({
          solution,
          dictionary,
          possible: dictionary
            .filter(word => hasAllPresent(summary, word))
            .filter(word => regex.test(word))
        });
      });
    }).then(({dictionary, possible, solution}) => {
      const possibleUsage = getUsage(possible);
      const fullUsage = getUsage(dictionary);

      return possible
        .sort((a, b) => midSort({usage: fullUsage, length: dictionary.length, a, b }))
        .sort((a, b) => midSort({usage: possibleUsage, length: possible.length, a, b }))
        .sort((a, b) => String(Array.from(new Set(b.split(''))).length).localeCompare(String(Array.from(new Set(a.split(''))).length), 'en', { numeric: true }))
      ;
    });
  };

  const getSiteName = () => {
    let sites = {
      wordle: /nytimes\.com\/games\/wordle\b/i
    };
    return Object.entries(sites)
      .find(([key, value]) => value.test(document.location))
      ?.[0];
  };

  const getDictionary = (site) => {
    let dictionaryMapper = {
      wordle: async() => fetch('.').then(resp => resp.text())
        .then(data => data.match(/src=['"](.{0,100}wordle\.[\d\w]{15,25}\.js)/mi)?.pop())
        .then((jsUrl) => fetch(jsUrl).then(resp => resp.text()))
        .then(data => data.match(/(["'](\w{5})["'],? ?){100,}/g).shift().split(/['", ]+/).filter(Boolean))
    };
    return dictionaryMapper[site]();
  };

  const getBoard = (site) => {
    let boardMapper = {
      wordle: () => Array.from(document.getElementById('wordle-app-game').querySelectorAll('[class^="Row"], [class^="row"]'))
        .map(row => Array.from(row.childNodes).map((tileNode) => getTile(site, tileNode)))
    };
    return boardMapper[site]();
  };

  const getSolution = (site) => {
    let solutionMapper = {
      wordle: () => fetch(`https://www.nytimes.com/svc/wordle/v2/${(new Date()).toJSON().split('T').shift()}.json`).then(resp => resp.json())
        .then(data => data.solution)
    };
    return solutionMapper[site]();
  };

  const getTile = (site, tileNode) => {
    return {
      state: getTileState(site, tileNode),
      letter: getTileLetter(site, tileNode),
    };
  };

  const getTileState = (site, tileNode) => {
    let tileMapper = {
      /* These match with no mapping */
      wordle: () => tileNode.firstChild?.dataset?.state.toLowerCase()
    };
    return tileMapper[site]();
  };

  const getTileLetter = (site, tileNode) => {
    let tileMapper = {
      wordle: () => tileNode.innerText.toLowerCase()
    };
    return tileMapper[site]();
  };

  const getBoardSummary = (board) => {
    return {
      absent: Array.from(new Set(
        board
          .flat()
          .flat()
          .filter(cell => cell.state === ABSENT)
          .map(cell => cell.letter)
      )),
      present: Array.from(new Set(
        board
          .flat()
          .flat()
          .filter(cell => cell.state === PRESENT || cell.state === CORRECT)
          .map(cell => cell.letter)
      )),
      exactPresent: Array.from(new Set(Array(board[0].length).fill('')
        .map((nil, tileIndex) => board.map(row => row[tileIndex])
          .filter(tile => tile.state === PRESENT)
          .map(tile => tile.letter)
        )))
      ,
      correct: Array(board[0].length).fill('')
        .map((nil, tileIndex) => board.map(row => row[tileIndex])
          .find(tile => tile.state === CORRECT)?.letter
        )
    };
  };

  const getRegex = (summary) => {
    return new RegExp(Array(summary.correct.length).fill('')
      .map((nil, tileIndex) => summary.correct[tileIndex] ??
        `[^${summary.absent.join('')}${summary.exactPresent[tileIndex].join('')}]`
      ).join(''), 'i');
  };

  const hasAllPresent = (summary, word) => summary.present?.every(letter => word.toLowerCase().includes(letter));

  const getUsage = (dictionary) => {
    return Array(dictionary[0].length).fill('')
      .map((nil, tileIndex) => {
        return dictionary.reduce((arr, word) => Object.assign(arr, {
          [word[tileIndex]]: (arr[[word[tileIndex]]] ?? 0) + 1
        }), {});
      });
  };

  const midSort = ({ usage, length, a, b }) => {
    const [aScore, bScore] = [a, b].map(word => word.toLowerCase().split('').reduce((aggregate, letter, index) => {
      return aggregate + Math.abs(length/2 - usage[index][letter]);
    }, 0));
    return String(aScore).localeCompare(String(bScore), 'en', { numeric: true });
  };

  /* INITIALIZATION */
  return init().catch(err => {
    alert(err?.message ?? 'Unknown error');
  }).then(possible => {
    alert('Possible Options:\n' +
      possible.slice(0, 10).map(word => `* ${word}`).join('\n')
    );
  });
