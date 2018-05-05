var fdata = typeof fdata !== 'undefined' && fdata.gathered ? fdata : {
  requests: {},
  output: [],
  outputPrep: {},
  more: [],
  stats: {
    requests: 0,
    attempts: 0,
    attemptscore: 0,
    ties: 0,
    morelinksclicked: 0,
  }
};

var flair = {
  thread_id: document.location.href.split('/')[6],
  init: function () {
    var styler,
      str = '#flair-output { color: #000; position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); background: #fff; padding: 15px; z-index: 999; max-height: 80vh; overflow: auto; }';
    str += '#flair-output button { width: 100%; margin: .5em 0; display: block; text-align: left; }';
    str += '#flair-output button .author { float: left; opacity: .6; }';
    str += '#flair-output button .points { float: right; opacity: .6; }';
    str += '#flair-output button .text { float: left; clear: both; font-size: 1.2em; margin-top: .3em;}';
    if (!document.getElementById('styler')) {
      styler = document.createElement('style');
      styler.setAttribute('id', 'styler');
      styler.innerHTML = str;
      document.head.appendChild(styler);
    } else {
      styler = document.getElementById('styler');
      styler.innerHTML = str;
    }

    fdata.output = [];
    fdata.outputPrep = {};

    if (!fdata.gathered) {
      flair.get.allComments();
      return 'Getting all comments';
    }
    flair.checkTies();
    return 'skipping load';
  },
  title: function (str) {
    document.title = str;
    flair.output(str);
  },
  output: function (str) {
    var output;
    if (!document.getElementById('flair-output')) {
      output = document.createElement('div');
      output.setAttribute('id', 'flair-output');
      output.innerHTML = str;
      document.body.appendChild(output);
    } else {
      output = document.getElementById('flair-output');
      output.innerHTML = str;
    }
  },
  get: {
    allComments: function () {
      flair.title('Getting base comments');
      fetch('/r/CenturyClub/comments/' + flair.thread_id + '/x/.json?limit=1500', {
        credentials: 'include',
        headers: {
          'cookie': document.cookie
        },
        referrer: document.location.protocol + '//' + document.location.host
      }).then(function (response) {
        return response.json();
      }).then(function (data) {
        fdata.modhash = data[1].data.modhash;
        flair.apply(data[1].data.children);
        flair.get.more();
      });
    },
    more: function () {
      if (fdata.more.length) {
        fdata.gathered = false;
        flair.title('Fetching ' + fdata.more[0] + ': ' + fdata.more.length + ' remaining');
        fetch('/r/CenturyClub/comments/' + flair.thread_id + '/x/' + fdata.more[0] + '.json?limit=1500', {
          credentials: 'include',
          headers: {
            'cookie': document.cookie
          },
          referrer: document.location.protocol + '//' + document.location.host
        }).then(function (response) {
          return response.json();
        }).then(function (data) {
          fdata.modhash = data[1].data.modhash;
          fdata.stats.morelinksclicked++;
          fdata.more.shift();
          var items = data[1].data.children;
          if (items[0]) {
            flair.apply(items);
          }
          flair.get.more();
        });
      } else {
        fdata.gathered = true;
        flair.checkTies();
      }
    }
  },
  apply: function (data) {
    for (var i = 0; i < data.length; i++) {
      if (data[i].kind === 'more') {
        fdata.more = fdata.more.concat(data[i].data.children);
      } else {
        var item = data[i].data;
        var parentid = item.parent_id.replace(/.*?_/, '');

        if (fdata.more.indexOf(item.id) !== -1) {
          fdata.more.splice(fdata.more.indexOf(item.id), 1);
        }

        if (item.parent_id === item.link_id) {
          if (!fdata.requests[item.id]) {
            fdata.requests[item.id] = {
              id: item.id,
              author: item.author,
              class: item.author_flair_css_class,
              children: [],
            };
          }

          if (item.replies && item.replies.data.children) {
            flair.apply(item.replies.data.children);
          }
        } else if (fdata.requests[parentid]) {
          fdata.requests[parentid].children.push({
            id: item.id,
            author: item.author,
            score: item.score,
            text: item.body,
          });
        } else {
          console.log('Somehow I have a child comment with no parent');
        }
      }
    }
  },
  checkTies: function () {
    var i, key, str;
    flair.title('Breaking ties');

    function tiebreaker(event) {
      var el = event.currentTarget,
        parent = el.getAttribute('data-parent'),
        index = el.getAttribute('data-index');

      fdata.requests[parent].tieBroken = true;
      fdata.requests[parent].children[index].winner = true;

      flair.checkTies();
    }

    var thereAreTies = false;
    for (key in fdata.requests) {
      if (fdata.requests.hasOwnProperty(key) && !fdata.requests[key].tieBroken) {
        flair.tempArr = [];
        fdata.requests[key].children = fdata.requests[key].children.sort(function (a, b) {
          return (a.score > b.score ? -1 : (a.score < b.score ? 1 : 0));
        });

        var children = fdata.requests[key].children,
          highScore = children[0].score;

        for (i = 0; i < children.length; i++) {
          if (children[i].score === highScore) {
            fdata.requests[key].children[i].index = i;
            flair.tempArr.push(children[i]);
          }
        }

        if (flair.tempArr.length > 1) {
          thereAreTies = true;
          fdata.stats.ties++;

          str = '<div class="parent_author">Flair for /u/' + fdata.requests[key].author + ' has a tie. Choose a winner.</div>';
          for (i = 0; i < flair.tempArr.length; i++) {
            fdata.requests[key].children[flair.tempArr[i].index].tied = true;
            str += '<button class="tiebreaker" data-parent="' + key + '" data-index="' + flair.tempArr[i].index + '"><div><span class="author">/u/' + flair.tempArr[i].author + '</span> <span class="points">' + flair.tempArr[i].score + ' points</span></div><div class="text">' + flair.tempArr[i].text + '</div></button>';
          }
          flair.output(str);

          var buttons = document.getElementsByClassName('tiebreaker');

          for (i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', tiebreaker);
          }

          break;
        } else {
          fdata.requests[key].children[0].winner = true;
        }
      }
    }

    if (!thereAreTies) {
      flair.resolveData();
    }
  },
  resolveData: function () {
    var key, i, request, item;
    var baseUserData = {
      attempts: 0,
      wins: 0
    };

    fdata.stats.requests = 0;
    fdata.stats.attempts = 0;
    fdata.stats.attemptscore = 0;

    for (key in fdata.requests) {
      if (fdata.requests.hasOwnProperty(key)) {
        fdata.stats.requests++;
        request = fdata.requests[key];

        if (!fdata.outputPrep[request.author]) {
          fdata.outputPrep[request.author] = {
            attempts: 0,
            wins: 0,
            request_link: [],
            attempt_link: [],
            win_link: []
          };
        }

        fdata.outputPrep[request.author].author = request.author;
        fdata.outputPrep[request.author].replies = request.children.length;
        fdata.outputPrep[request.author].class = request.class;
        fdata.outputPrep[request.author].hadTie = !!request.tieBroken;

        if (fdata.outputPrep[request.author].request_link.indexOf(request.id) === -1) {
          fdata.outputPrep[request.author].request_link.push(request.id);
        }

        for (i = 0; i < request.children.length; i++) {
          item = request.children[i];
          fdata.stats.attempts++;
          fdata.stats.attemptscore += item.score;

          if (!fdata.outputPrep[item.author]) {
            fdata.outputPrep[item.author] = {
              attempts: 0,
              wins: 0,
              request_link: [],
              attempt_link: [],
              win_link: []
            };
          }

          fdata.outputPrep[item.author].attempts++;
          fdata.outputPrep[item.author].author = item.author;

          if (fdata.outputPrep[item.author].attempt_link.indexOf(item.id) === -1) {
            fdata.outputPrep[item.author].attempt_link.push(item.id);
          }

          if (item.winner) {
            fdata.outputPrep[item.author].wins++;
            fdata.outputPrep[request.author].flair_text = item.text.match(/\[.{,62}\]/) ? item.text.match(/\[.{,62}\]/)[0] : '[]';
            fdata.outputPrep[request.author].flair_link = item.id;
            if (fdata.outputPrep[item.author].win_link.indexOf(item.id) === -1) {
              fdata.outputPrep[item.author].win_link.push(item.id);
            }
          }
        }
      }
    }

    for (key in fdata.outputPrep) {
      item = fdata.outputPrep[key];
      item.weighted = item.attempts > 0 ? item.wins * (item.wins / item.attempts) : 0;
      item.moocher = item.attempts == 0;
      fdata.output.push(item);
    }

    fdata.output = fdata.output.sort(function (a, b) {
      return (a.weighted > b.weighted ? -1 :
        (a.weighted < b.weighted ? 1 :
          (a.moocher > b.moocher ? 1 :
            (a.moocher < b.moocher ? -1 :
              (a.attempts > b.attempts ? 1 :
                (a.attempts < b.attempts ? -1 :
                  (a.author.toLowerCase() > b.author.toLowerCase() ? 1 :
                    (a.author.toLowerCase() < b.author.toLowerCase() ? -1 : 0))))))));
    });

    if (confirm('Would you like to set flairs?')) {
      fdata.flairsetter = fdata.output.slice();
      flair.setFlairs();
    } else {
      flair.outputer();
    }
  },
  outputer: function () {
    var str = '#In this month\'s flair thread: \n\n';
    var base = '/r/CenturyClub/comments/' + flair.thread_id;
    var tablestr = 'User|Successful Flairs|Attempted Flairs|Weighted Successes|Success Permalinks\n';
    tablestr += ':--|--:|--:|--:|:--\n';
    var ii;
    for (i = 0; i < fdata.output.length; i++) {
      item = fdata.output[i];
      var tiestr = item.hadTie ? ' *' : '';
      if (item.request_link.length == 1) {
        tablestr += '[' + item.author.replace(/_/g, '\\_') + '](' + base + '/_/' + item.request_link[0] + ')'+tiestr+'|';
      } else if (item.request_link.length > 1) {
        tablestr += item.author.replace(/_/g, '\\_') + ' ';
        for (ii = 0; ii < item.request_link.length; ii++) {
          tablestr += '[[' + (ii + 1) + ']](' + base + '/_/' + item.request_link[ii] + ')';
        }
        tablestr += tiestr+'|';
      } else {
        tablestr += item.author.replace(/_/g, '\_') + tiestr + '|';
      }

      tablestr += (item.attempts > 0 ? item.wins : '-') + '|';
      tablestr += (item.attempts > 0 ? item.attempts : '-') + '|';
      tablestr += (item.attempts > 0 ? item.weighted.toFixed(2) : '-') + '|';

      for (ii = 0; ii < item.win_link.length; ii++) {
        tablestr += '[[' + (ii + 1) + ']](' + base + '/_/' + item.win_link[ii] + '?context=1)';
      }
      tablestr += '\n';
    }
    tablestr += (fdata.stats.ties > 0 ? '\n\\* had a tie that was resolved\n\n' : '');

    tablestr +=  '---\n\n##Some stats: \n\n* ' + fdata.stats.requests + ' requests\n\n';
    tablestr += '* ' + fdata.stats.attempts + ' attempts\n\n';
    tablestr += '* ' + fdata.stats.ties + ' ties\n\n';
    tablestr += '* ' + (fdata.stats.attemptscore / fdata.stats.attempts).toFixed(2) + ' average attempt score\n\n';
    tablestr += '* clicked ' + (fdata.stats.morelinksclicked) + ' "more" links\n\n';

    tablestr += '\n\n---\n\n[Here\'s a link to the flair thread](' + base + ')\n';

    str = '<textarea>' + str + tablestr + '</textarea>';
    flair.title('Done');
    flair.output(str);
  },
  setFlairs: function () {
    if (fdata.flairsetter.length && fdata.outputPrep[fdata.flairsetter[0].author].flair_text) {
      flair.title('Setting flair for ' + fdata.flairsetter[0].author);

      var data = {
        name: fdata.flairsetter[0].author,
        text: fdata.outputPrep[fdata.flairsetter[0].author].flair_text,
        css_class: fdata.flairsetter[0].author == fdata.output[0].author ? 'monthlywinner' : '',
        id: '#flair-xxxxx',
        r: r.config.cur_listing,
        uh: fdata.modhash,
        renderstyle: 'json'
      };
      
      var form_data = new FormData();

      for (var key in data) {
        form_data.append(key, data[key]);
      }

      fetch('/api/flair', {
        credentials: 'include',
        headers: {
          'cookie': document.cookie
        },
        body: form_data,
        method: 'POST',
        referrer: document.location.protocol + '//' + document.location.host
      }).then(function (response) {
        return response.json();
      }).then(function (data) {
        fdata.flairsetter.shift();
        flair.setFlairs();
      });
    } else if (fdata.flairsetter.length) {
      fdata.flairsetter.shift();
      flair.setFlairs();
    } else {
      flair.outputer();
    }
  }
};

flair.init();