javascript: (function () {
  var fdata = typeof fdata !== 'undefined' && fdata.gathered ? fdata : {
    requests: {},
    output: [],
    outputPrep: {},
    more: [],
    stats: {
      requests: 0,
      attempts: 0,
      attemptscore: 0,
      winscore: 0,
      ties: 0,
      morelinksclicked: 0,
      newUsers: [],
    },
    times: {
      moreStart: new Date(),
      moreEnd: new Date(),
      tieStart: new Date(),
      tieEnd: new Date(),
      applyStart: new Date(),
      applyEnd: new Date(),
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
        fdata.times.moreStart = new Date();
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
          fdata.times.moreEnd = new Date();
          fdata.gathered = true;
          fdata.times.tieStart = new Date();
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
            if (!fdata.requests[item.id] && !item.removed && !item.spam) {
              fdata.requests[item.id] = {
                id: item.id,
                author: item.author,
                class: item.author_flair_css_class,
                newUser: !item.author_flair_text,
                children: [],
              };
            }

            if (item.replies && item.replies.data.children) {
              flair.apply(item.replies.data.children);
            }
          } else if (fdata.requests[parentid] && !item.removed && !item.spam) {
            var flair_text = flair.decode(item.body_html) || item.body;
            fdata.requests[parentid].children.push({
              id: item.id,
              author: item.author,
              score: item.score,
              text: flair_text.match(/\[.{0,62}\]/) ? flair_text.match(/\[.{0,62}\]/)[0] : '[]'
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

          if (fdata.requests[key].children.length) {
            var children = fdata.requests[key].children,
              highScore = children[0].score;

            for (i = 0; i < children.length; i++) {
              if (children[i].score === highScore) {
                fdata.requests[key].children[i].index = i;
                flair.tempArr.push(children[i]);
              }
            }
          } else {
            alert(fdata.requests[key].author + ' has a request with no responses');
            break;
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
          } else if (fdata.requests[key].children.length) {
            fdata.requests[key].children[0].winner = true;
          }
        }
      }

      if (!thereAreTies) {
        fdata.times.tieEnd = new Date();
        flair.resolveData();
      }
    },
    resolveData: function () {
      var key, i, request, item;

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

          if (request.newUser && request.author !== '[deleted]') {
            fdata.stats.newUsers.push(request.author);
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
              fdata.stats.winscore += item.score;

              fdata.outputPrep[request.author].flair_text = item.text;
              fdata.outputPrep[request.author].flair_link = item.id;
              if (fdata.outputPrep[item.author].win_link.indexOf(request.author + ',' + item.id) === -1) {
                fdata.outputPrep[item.author].win_link.push(request.author + ',' + item.id);
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

      fdata.stats.newUsers = flair.sort(fdata.stats.newUsers);

      if (confirm('Would you like to set flairs?')) {
        fdata.flairsetter = fdata.output.slice();
        fdata.times.applyStart = new Date();
        flair.setFlairs();
      } else {
        flair.outputer();
      }
    },
    outputer: function () {
      var baseUrl = '/r/CenturyClub/comments/' + flair.thread_id,
        str = '#In this month\'s flair thread: \n\n';

      function requestHandler(item) {
        var tiestr = item.hadTie ? ' *' : '';
        var requestStr = '';
        if (item.request_link.length == 1) {
          requestStr += '[' + flair.sanitize(item.author) + '](' + baseUrl + '/_/' + item.request_link[0] + ')' + tiestr;
        } else if (item.request_link.length > 1) {
          requestStr += flair.sanitize(item.author) + ' ';
          for (ii = 0; ii < item.request_link.length; ii++) {
            requestStr += '[[' + (ii + 1) + ']](' + baseUrl + '/_/' + item.request_link[ii] + ')';
          }
          requestStr += tiestr;
        } else {
          requestStr += flair.sanitize(item.author) + tiestr;
        }
        return requestStr;
      }

      function prepTable() {
        var i, ii;
        var tablestr = 'User|Successful Flairs|Attempted Flairs|Weighted Successes|Success Permalinks\n';
        tablestr += ':--|--:|--:|--:|:--\n';
        for (i = 0; i < fdata.output.length; i++)  {
          item = fdata.output[i];
          tablestr += requestHandler(item) + '|';

          tablestr += (item.attempts > 0 ? item.wins : '-') + '|';
          tablestr += (item.attempts > 0 ? item.attempts : '-') + '|';
          tablestr += (item.attempts > 0 ? item.weighted.toFixed(2) : '-') + '|';

          item.win_link = flair.sort(item.win_link);
          for (ii = 0; ii < item.win_link.length; ii++) {
            tablestr += '[' + flair.sanitize(item.win_link[ii].split(',')[0]) + '](' + baseUrl + '/_/' + item.win_link[ii].split(',')[1] + '?context=1)' + (ii + 1 < item.win_link.length ? ', ' : '');
          }
            tablestr += '\n';
        }

        tablestr += fdata.stats.ties > 0 ? '\n\\* had a tie that was resolved\n\n' : '';
        tablestr += '*Table sorted by if the user was a moocher, weighted score desc, number of attempts asc, username asc*\n\n';
        return tablestr;
      }

      function prepNewUsers() {
        var newUserStr = '\n\n---\n\n##New users / users with flair disabled\n\n';
        for (i = 0; i < fdata.stats.newUsers.length; i++) {
          var item = fdata.outputPrep[fdata.stats.newUsers[i]];
          newUserStr += requestHandler(item) + ', ';
        }
        return newUserStr;
      }

      function prepStats() {
        var statsStr = '---\n\n##Some stats: \n\n';
        statsStr += '* clicked ' + fdata.stats.morelinksclicked + ' "more" links\n';
        statsStr += ' * ' + flair.diff('Loaded all comments', fdata.times.moreStart, fdata.times.moreEnd, fdata.stats.morelinksclicked + 1) + '\n\n';

        statsStr += '* ' + fdata.stats.ties + ' ties (' + (100 * (fdata.stats.ties / fdata.stats.requests)).toFixed(1) + '%)\n';
        statsStr += ' * ' + flair.diff('Resolved ties', fdata.times.tieStart, fdata.times.tieEnd, fdata.stats.ties) + '\n\n';

        statsStr += '* ' + fdata.stats.requests + ' requests\n';
        statsStr += ' * ' + flair.diff('Applied flairs', fdata.times.applyStart, fdata.times.applyEnd, fdata.stats.requests) + '\n\n';

        statsStr += '* ' + fdata.stats.attempts + ' attempts\n\n';
        statsStr += '* ' + (fdata.stats.winscore / fdata.stats.requests).toFixed(2) + ' average winning score\n\n';
        statsStr += '* ' + (fdata.stats.attemptscore / fdata.stats.attempts).toFixed(2) + ' average attempt score\n\n';
        statsStr += '* ' + (fdata.stats.attempts / fdata.stats.requests).toFixed(2) + ' average attempts per reply\n\n';
        return statsStr;
      }

      str += prepTable();
      str += prepNewUsers();
      str += prepStats();

      str += '\n\n---\n\n[Here\'s a link to the flair thread](' + baseUrl + ')\n';
      str = '<textarea>' + str + '</textarea>';
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
        fdata.times.applyEnd = new Date();
        flair.outputer();
      }
    },
    sort: function(arr) {
      return arr.sort(function (a,b) {
        return (a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0));
      });
    },
    decode: function (str) {
      return $ && $("<div/>").html($("<div/>").html(str).text()).text().trim();
    },
    sanitize: function (str) {
      return str.replace(/_/g, '\\_');
    },
    diff: function (label, start, end, qty) {
      var diff = Math.round((end.getTime() - start.getTime()) / 1000);
      if (diff == 0) {
        return '';
      }

      var minutes = Math.floor(diff / 60),
        seconds = diff - (minutes * 60);

      return label + ' in ' + minutes + ':' + ('0' + seconds).slice(-2) + ' - *average ' + (diff / qty).toFixed(2) + ' seconds*';
    }
  };

  flair.init();
})();
