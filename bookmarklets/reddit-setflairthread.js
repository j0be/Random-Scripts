javascript: (function () {
  window.fdata = typeof window.fdata !== 'undefined' && window.fdata.gathered ? window.fdata : {
    requests: {},
    output: [],
    outputPrep: {},
    more: [],
    cantFollowInstructions: [],
    stats: {
      requests: 0,
      attempts: 0,
      attemptscore: 0,
      winscore: 0,
      ties: 0,
      morelinksclicked: 0,
      newUsers: 0,
      disabledUsers: 0
    },
    times: {
      moreStart: new Date(),
      moreEnd: new Date(),
      tieStart: new Date(),
      tieEnd: new Date(),
      applyStart: new Date(),
      applyEnd: new Date(),
    },
    mapper: {
      tied: '\\*',
      new: '&#8224;',
      disabled: '&#8225;'
    }
  };

  var flair = {
    thread_id: document.location.href.split('/')[6],
    init: function () {
      var styler,
        str = '#flair-output { color: #000; position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 999; overflow: visible; }';
      str += '#flair-output button { width: 100%; margin: .5em 0; display: block; text-align: left; text-transform: none; }';
      str += '#flair-output button a { pointer-events: none; }';
      str += '#flair-output button .author { float: left; opacity: .6; }';
      str += '#flair-output button .points { float: right; opacity: .6; }';
      str += '#flair-output button .text { float: left; clear: both; font-size: 1.2em; margin-top: .3em;}';
      str += '#flair-output::before { content: ""; display: block; position: fixed; background: rgba(0, 0, 0, .4); top: -100vh; left: -100vw; right: -100vw; bottom: -100vh; z - index: -1; pointer-events: none; }';
      str += '#flair-output > div { padding: 15px; background: #fff; position: relative; z-index: 1; max-height: 80vh; overflow: auto; }';
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
        output.innerHTML = '<div>'+str+'</div>';
        document.body.appendChild(output);
      } else {
        output = document.getElementById('flair-output');
        output.innerHTML = '<div>' + str + '</div>';
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
          flair.get.handler(data);
        });
      },
      more: function () {
        if (fdata.more.length) {
          fdata.gathered = false;
          flair.title('Fetching more links: ' + fdata.more.length + ' remaining');
          fetch('/r/CenturyClub/comments/' + flair.thread_id + '/x/' + fdata.more[0] + '.json?limit=1500', {
            credentials: 'include',
            headers: {
              'cookie': document.cookie
            },
            referrer: document.location.protocol + '//' + document.location.host
          }).then(function (response) {
            return response.json();
          }).then(function (data) {
            flair.get.handler(data, true);
          });
        } else {
          fdata.times.moreEnd = new Date();
          fdata.gathered = true;
          fdata.times.tieStart = new Date();
          flair.checkTies();
        }
      },
      handler: function (data, isMore) {
        if (isMore) {
          fdata.stats.morelinksclicked++;
          fdata.more.shift();
        }

        fdata.modhash = data[1].data.modhash;
        var items = data[1].data.children;
        if (items[0]) {
          flair.apply(items);
        }
        flair.get.more();
      }
    },
    apply: function (data, index) {
      for (var i = index || 0; i < data.length; i++) {
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
                attributes: [],
                class: item.author_flair_css_class,
                children: [],
              };
            }
            if (!item.author_flair_text && item.author !== '[deleted]' && !item.checkedBlank) {
              flair.checkBlankFlair(item.id, item.author, data, i);
              break;
            } else if (item.replies && item.replies.data.children) {
              flair.apply(item.replies.data.children);
            }
          } else if (fdata.requests[parentid] && !item.removed && !item.spam) {
            var flair_text = flair.decode(flair.decode(item.body_html).replace(/<.*?>/gm, '')).replace(/[\n\r]/g,'') || item.body;
            flair_text = flair_text.match(/\[.{0,62}\]/m) ? flair_text.match(/\[.{0,62}\]/m)[0] : flair_text;

            var followedInstructions = flair_text.length <= 64 && flair_text.match(/\[.{0,62}\]/m);
            if (flair_text.length <= 62 && !flair_text.match(/^\[/)) { flair_text = '[' + flair_text; } /*Leading bracket*/
            if (flair_text.length <= 63 && !flair_text.match(/\]$/)) { flair_text += ']'; } /*Trailing bracket*/

            flair_text = flair_text.match(/\[.{0,62}\]/m) ? flair_text.match(/\[.{0,62}\]/m)[0] : '[' + item.author + ' can\'t read instructions]';
            var attempt = {
              id: item.id,
              author: item.author,
              score: item.score,
              text: flair_text
            };

            fdata.requests[parentid].children.push(attempt);
            if (!followedInstructions) {
              fdata.cantFollowInstructions.push(attempt);
            }
          } else {
            console.log('Somehow I have a child comment with no parent: ' + item.id);
          }
        }
      }
    },
    checkBlankFlair: function(id, author, data, index) {
      flair.title('Checking blank flair for ' + author);
      var esc = encodeURIComponent,
        params = {
          name: author,
          r: r.config.cur_listing,
          uh: fdata.modhash
        },
        paramStr = Object.keys(params)
          .map(function(k) { return esc(k) + '=' + esc(params[k]); })
          .join('&');

      fetch('/r/CenturyClub/api/flairlist.json?' + paramStr, {
        credentials: 'include',
        headers: {
          'cookie': document.cookie
        },
        referrer: document.location.protocol + '//' + document.location.host
      }).then(function (response) {
        return response.json();
      }).then(function (responseData) {
        if (!!responseData.users[0].flair_text) {
          fdata.stats.disabledUsers ++;
          fdata.requests[id].attributes.push(fdata.mapper.disabled);
        } else {
          fdata.stats.newUsers ++;
          fdata.requests[id].attributes.push(fdata.mapper.new);
        }
        data[index].data.checkedBlank = true;
        flair.apply(data, index);
      });
      
    },
    checkTies: function () {
      var i, key, str, index = 0;
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
        if (fdata.requests.hasOwnProperty(key)) {
          index++;
          if (!fdata.requests[key].tieBroken) {
            flair.title('Breaking ties: ' + index + '/' + Object.keys(fdata.requests).length);
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
            } else if (!fdata.requests[key].alerted) {
              fdata.requests[key].alerted = true;
              alert(fdata.requests[key].author + ' has a request with no responses');
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
              win_link: [],
              attributes: []
            };
          }

          fdata.outputPrep[request.author].author = request.author;
          fdata.outputPrep[request.author].replies = request.children.length;
          fdata.outputPrep[request.author].class = request.class;
          fdata.outputPrep[request.author].attributes = request.attributes;
          if (!!request.tieBroken) {
            fdata.outputPrep[request.author].attributes.push(fdata.mapper.tied);
          }

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

      if (confirm('Would you like to set flairs?')) {
        fdata.flairsetter = fdata.output.slice();
        fdata.times.applyStart = new Date();
        flair.setFlairs();
      } else {
        flair.outputer();
      }
    },
    outputer: function () {
      var baseUrl = '/r/CenturyClub/comments/' + flair.thread_id;
      function requestHandler(item) {
        var requestStr = '';
        item.attributes = item.attributes && item.attributes.filter(flair.unique) || [];
        if (item.request_link.length == 1) {
          requestStr += '[' + flair.sanitize(item.author) + '](' + baseUrl + '/_/' + item.request_link[0] + ')';
        } else if (item.request_link.length > 1) {
          requestStr += flair.sanitize(item.author) + ' ';
          for (ii = 0; ii < item.request_link.length; ii++) {
            requestStr += '[[' + (ii + 1) + ']](' + baseUrl + '/_/' + item.request_link[ii] + ')';
          }
        } else {
          requestStr += flair.sanitize(item.author);
        }
        return requestStr + (item.attributes.length ? ' ' + item.attributes.join('') : '');
      }

      function outputMainInformation() {
        var i, ii,
          definitionstr = '',
          moocherstr = '###Moochers\n\nThe users who requested flair, but didn\'t suggest any for anyone else.\n\n',
          tablestr = 'User|Wins|Tries|Score|Win Permalinks\n';
        tablestr += ':--|--:|--:|--:|:--\n';
        for (i = 0; i < fdata.output.length; i++)  {
          item = fdata.output[i];
          if (item.attempts) {
            tablestr += requestHandler(item) + '|';

            tablestr += (item.attempts > 0 ? item.wins : '-') + '|';
            tablestr += (item.attempts > 0 ? item.attempts : '-') + '|';
            tablestr += (item.attempts > 0 ? item.weighted.toFixed(2) : '-') + '|';

            item.win_link = flair.sort(item.win_link);
            for (ii = 0; ii < item.win_link.length; ii++) {
              tablestr += '[' + flair.sanitize(item.win_link[ii].split(',')[0]) + '](' + baseUrl + '/_/' + item.win_link[ii].split(',')[1] + '?context=1)' + (ii + 1 < item.win_link.length ? ', ' : '');
            }
            tablestr += '\n';
          } else {
            moocherstr += requestHandler(item) + ', ';
          }
        }

        tablestr += '^(*Table sorted by weighted score desc, number of attempts asc, username asc*)\n\n';


        definitionstr += '\n |Definitions\n--:|:--\n';
        definitionstr += fdata.stats.ties > 0 ? fdata.mapper.tied.replace(/\\/g,'') + '|had a tie that was resolved\n' : '';
        definitionstr += fdata.stats.newUsers > 0 ? fdata.mapper.new + '|new users\n' : '';
        definitionstr += fdata.stats.disabledUsers > 0 ? fdata.mapper.disabled + '|users with flair disabled\n' : '';
        definitionstr += 'Wins|replies to flair requests that are highest voted at the thread close.\n';
        definitionstr += 'Tries|any reply to the flair requests.\n';
        definitionstr += 'Score|weighted score of `wins * ( wins / tries)`\n\n';
        return tablestr + '\n' + moocherstr.slice(0, -2) + '\n\n' + definitionstr;
      }

      function outputStats() {
        var statsStr = '#Some stats:\n\n';
        statsStr += '\\#|Units|Summary\n--:|:--|:--\n';
        statsStr += fdata.stats.morelinksclicked + '|-|"More" links clicked\n';
        statsStr += flair.diff(fdata.times.moreStart, fdata.times.moreEnd) + '|Minutes|Loaded all comments\n';
        statsStr += flair.diff(fdata.times.moreStart, fdata.times.moreEnd, fdata.stats.morelinksclicked + 1) + '|Seconds|Average "more" link load time\n';
        statsStr += fdata.stats.requests + '|-|Flair requests\n';
        statsStr += (fdata.stats.attempts / fdata.stats.requests).toFixed(2) + '|-|Attempts per flair request\n';
        statsStr += fdata.stats.ties + '|-|Requests ended in ties\n';
        statsStr += (100 * (fdata.stats.ties / fdata.stats.requests)).toFixed(1) + '%|-|Requests ended in ties\n';
        statsStr += flair.diff(fdata.times.tieStart, fdata.times.tieEnd) + '|Minutes|Time to resolve ties\n';
        statsStr += flair.diff(fdata.times.tieStart, fdata.times.tieEnd, fdata.stats.ties) + '|Seconds|Average time to resolve a single tie\n';
        statsStr += fdata.stats.attempts + '|-|Flair attempts\n';
        statsStr += (fdata.stats.winscore / fdata.stats.requests).toFixed(2) + '|Upvotes|Karma average per winning flair\n';
        statsStr += (fdata.stats.attemptscore / fdata.stats.attempts).toFixed(2) + '|Upvotes|Karma average per attempt\n';
        if (fdata.times.applyStart) {
          statsStr += (flair.diff(fdata.times.applyStart, fdata.times.applyEnd) || '-') + '|Minutes|Time to set new flairs\n';
          statsStr += (flair.diff(fdata.times.applyStart, fdata.times.applyEnd, fdata.stats.requests) || '-') + '|Seconds|Average time to set a single flair\n\n';
        }
        return statsStr;
      }

      function getRuleBreakers() {
        var ruleBreakerStr = 'These people just couldn\'t seem to read simple instructions: ';
        for (i = 0; i < fdata.cantFollowInstructions.length; i++) {
          var item = fdata.cantFollowInstructions[i];
          ruleBreakerStr += '[' + item.author + '](' + baseUrl + '/_/' + item.id + '?context=1), ';
        }
        return ruleBreakerStr;
      }

      var str = '#In this month\'s flair thread: \n\n';
      str += outputMainInformation();
      str += '\n\n---\n\n';
      str += outputStats();
      str += '\n\n---\n\n[Here\'s a link to the flair thread](' + baseUrl + ')\n';
      str = '<textarea>' + str + '</textarea>';


      var commentStr = '<textarea>' + getRuleBreakers() + '</textarea>';

      flair.title('Done');
      flair.output(str + commentStr);
    },
    setFlairs: function () {
      if (fdata.flairsetter.length && fdata.outputPrep[fdata.flairsetter[0].author].flair_text) {
        /*Research # POST [/r/subreddit]/api/flaircsv*/

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
      var txt = document.createElement("textarea");
      txt.innerHTML = str;
      return txt.value.trim();
    },
    sanitize: function (str) {
      return str.replace(/_/g, '\\_');
    },
    diff: function (start, end, qty) {
      var diff = Math.round((end.getTime() - start.getTime()) / 1000);
      if (diff == 0) {
        return '';
      }

      var minutes = Math.floor(diff / 60),
        seconds = diff - (minutes * 60);

      if (qty) {
        return (diff / qty).toFixed(2);
      }
      return minutes + ':' + ('0' + seconds).slice(-2);
    },
    unique: function(value, index, self) {
      return self.indexOf(value) === index;
    }
  };

  flair.init();
})();
