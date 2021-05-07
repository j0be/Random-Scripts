javascript: (function () {
    /* Keep track of some flair data */
    window.fdata = {
        requests: {},
        stream: {
            threadId: document.location.href.split('/')[6],
            users: {},
            moreLinks: [],
            flairChecks: [],
            commentIds: [],
            noReplies: []
        },
        stats: {
            requests: 0,
            attempts: 0,
            attemptscore: 0,
            winscore: 0,
            ties: 0,
            moreLinksClicked: 0,
            newUsers: 0,
            disabledUsers: 0
        },
        times: {
            fullStart: new Date(),
            fullEnd: '',
            loadStart: '',
            loadEnd: '',
            moreStart: '',
            moreEnd: '',
            tieStart: '',
            tieEnd: '',
            applyStart: '',
            applyEnd: ''
        },
        mapper: {
            tied: '\\*',
            new: '&#8224;',
            disabled: '&#8225;'
        }
    };
    /* The actual flair application */
    var flair = {
        setup: {
            init: function () {
                flair.setup.initCSS();
                flair.get.allComments();
            },
            initCSS: function () {
                var css = '#flair-output { color: #000; position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 999; overflow: visible; }';
                css += '#flair-output button { width: 100%; margin: .5em 0; display: block; text-align: left; text-transform: none; }';
                css += '#flair-output button.likes { background: #e17500; }';
                css += '#flair-output button a { pointer-events: none; }';
                css += '#flair-output button .author { float: left; opacity: .6; }';
                css += '#flair-output button .points { float: right; opacity: .6; }';
                css += '#flair-output button .text { float: left; clear: both; font-size: 1.2em; margin-top: .3em;}';
                css += '#flair-output::before { content: ""; display: block; position: fixed; background: rgba(0, 0, 0, .4); top: -100vh; left: -100vw; right: -100vw; bottom: -100vh; z - index: -1; pointer-events: none; }';
                css += '#flair-output > div { padding: 15px; background: #fff; position: relative; z-index: 1; max-height: 80vh; overflow: auto; }';

                var styler = document.createElement('style');
                styler.setAttribute('id', 'styler');
                styler.innerHTML = css;
                document.head.appendChild(styler);
            }
        },
        get: {
            allComments: function () {
                flair.output.title('Getting base comments');
                fdata.times.loadStart = new Date();
                fetch('/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/.json?limit=1500', {
                    credentials: 'include',
                    headers: { 'cookie': document.cookie },
                    referrer: document.location.protocol + '//' + document.location.host
                }).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    fdata.stream.modhash = data[1].data.modhash;
                    flair.parse.comments(data[1].data);
                });
            },
            more: function(id) {
                flair.output.title('Getting more comments: ' + fdata.stream.moreLinks[0]);
                fetch('/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/' + fdata.stream.moreLinks[0] + '.json?limit=1500', {
                    referrer: document.location.protocol + '//' + document.location.host,
                    credentials: 'include',
                    headers: {
                        'cookie': document.cookie
                    },
                }).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    fdata.stats.moreLinksClicked ++;
                    flair.parse.more(data);
                });
            },
            blankFlair: function(username) {
                flair.output.title('Checking blank flair for ' + username);
                var esc = encodeURIComponent;
                var params = {
                        name: username,
                        r: r.config.cur_listing,
                        uh: fdata.stream.modhash
                    };
                var paramStr = Object.keys(params).map(function (k) { return esc(k) + '=' + esc(params[k]); }).join('&');

                fetch('/r/' + r.config.cur_listing + '/api/flairlist.json?' + paramStr, {
                    referrer: document.location.protocol + '//' + document.location.host,
                    credentials: 'include',
                    headers: {
                        'cookie': document.cookie
                    }
                }).then(function (response) {
                    return response.json();
                }).then(flair.parse.blankFlair);
            }
        },
        set: {
            flairs: function() {
                /* Research # POST [/r/subreddit]/api/flaircsv */
                fdata.times.applyStart = new Date();

                /* Prepare the flair array */
                fdata.stream.flairs = Object.keys(fdata.stream.users).map(function(username) {
                    return fdata.stream.users[username];
                }).filter(function(user) {
                    return !! user.flairs.length;
                });
                flair.set.flair();
            },
            flair: function() {
                if (fdata.stream.flairs.length) {
                    var user = fdata.stream.flairs[0];
                    var reply = user.flairs.sort(flair.helpers.sort.weight)[0];

                    flair.output.title('Setting flair for ' + user.name);

                    var data = {
                        name: user.name,
                        text: reply.text,
                        css_class: fdata.stream.userArr[0].name === user.name ? 'monthlywinner' : '',
                        id: '#flair-xxxxx',
                        r: r.config.cur_listing,
                        uh: fdata.stream.modhash,
                        renderstyle: 'json'
                    };
                    var form_data = new FormData();
                    for (var key in data) { form_data.append(key, data[key]); }

                    fetch('/api/flair', {
                        referrer: document.location.protocol + '//' + document.location.host,
                        headers: {
                            'cookie': document.cookie
                        },
                        credentials: 'include',
                        body: form_data,
                        method: 'POST'
                    }).then(function (response) {
                        return response.json();
                    }).then(function (data) {
                        fdata.stream.flairs.shift();
                        flair.set.flair();
                    });
                } else {
                    fdata.times.applyEnd = new Date();
                    flair.output.summary();
                }
            },
            winner: function(reply) {
                reply.winner = true;
                fdata.stats.winscore += reply.score;
                flair.helpers.getUser(reply.parentName).flairs.push({
                    text: reply.text,
                    score: reply.score
                });
            }
        },
        parse: {
            comments: function (data) {
                if (data && data.children) {
                    data.children.forEach(function(comment) {
                        flair.parse.comment(comment);
                    });
                }

                if (fdata.stream.moreLinks.length + fdata.stream.flairChecks.length) {
                    if (fdata.stream.moreLinks.length) {
                        /* Get a more link */
                        fdata.times.moreStart = fdata.times.moreStart || new Date();
                        flair.get.more(fdata.stream.moreLinks[0]);
                    } else {
                        /* Check a blank flair */
                        fdata.times.moreEnd = fdata.times.moreEnd || new Date();
                        flair.get.blankFlair(fdata.stream.flairChecks[0]);
                    }
                } else if (fdata.stream.noReplies.length) {
                    alert('Killing process so that we can process requests with no replies. (Restart the script once you\'ve replied)');
                } else {
                    flair.output.title('Loaded all comments and user info');
                    fdata.times.moreEnd = fdata.times.moreEnd || new Date();
                    fdata.times.loadEnd = new Date();
                    flair.resolve.ties();
                }
            },
            comment: function (comment) {
                var isRequest = comment.data.parent_id.slice(0, 2) === 't3';
                if (comment.kind === 'more') {
                    var ids = isRequest ?
                        comment.data.children :
                        [comment.data.parent_id.slice(3)];
                    fdata.stream.moreLinks = fdata.stream.moreLinks.concat(ids);
                } else {
                    flair.parse.checkFlair(comment.data);

                    if (isRequest) {
                        flair.parse.request(comment.data);
                    } else if (!fdata.stream.commentIds.includes(comment.data.id)) {
                        fdata.stream.commentIds.push(comment.data.id);
                        flair.parse.reply(comment.data);
                    }
                }
            },
            checkFlair: function (comment) {
                if (!comment.author_flair_text && comment.author !== '[deleted]') {
                    if (!fdata.stream.flairChecks.includes(comment.author)) {
                        fdata.stream.flairChecks.push(comment.author);
                    }
                }
            },
            blankFlair: function (data) {
                var username = data.users[0].user;
                var user = flair.helpers.getUser(username);
                if (!!data.users[0].flair_text) {
                    fdata.stats.disabledUsers++;
                    user.attributes.push(fdata.mapper.disabled);
                } else {
                    fdata.stats.newUsers++;
                    user.attributes.push(fdata.mapper.new);
                }
                fdata.stream.flairChecks.shift();
                flair.parse.comments();
            },
            more: function (data) {
                fdata.stream.moreLinks.shift();
                flair.parse.comments(data[1].data);
            },
            request: function (comment) {
                if (!fdata.stream.commentIds.includes(comment.id)) {
                    fdata.stream.commentIds.push(comment.id);
                    fdata.stats.requests ++;
                    fdata.requests[comment.name] = {
                        id: comment.id,
                        name: comment.author,
                        replies: []
                    };
                }

                if (comment.replies) {
                    comment.replies.data.children.forEach(flair.parse.comment);
                } else if (!flair.helpers.isRemoved(comment) && !fdata.stream.noReplies.includes(comment.id) && confirm(comment.author + ' has a request with no replies')) {
                    fdata.stream.noReplies.push(comment.id);
                    window.open('http://reddit.com/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/' + comment.id + '?context=3');
                }
            },
            reply: function (comment) {
                if (!flair.helpers.isValidReply(comment)) {
                    if (fdata.requests[comment.parent_id]) {
                        fdata.requests[comment.parent_id].replies.push({
                            ids: [comment.id],
                            name: comment.author,
                            parentName: fdata.requests[comment.parent_id].name,
                            score: comment.score,
                            text: flair.parse.flairText(comment),
                            likes: comment.likes,
                            removed: flair.helpers.isRemoved(comment)
                        });
                        fdata.stats.attempts ++;
                        fdata.stats.attemptscore += comment.score;
                    } else if (confirm('Somehow I have a child comment with no parent: ' + comment.id)) {
                        window.open('http://reddit.com/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/' + comment.id + '?context=3');
                    }
                }
            },
            flairText: function(comment) {
                var flairText = flair.helpers.decode(flair.helpers.decode(String(comment.body_html || '').trim()).replace(/<.*?>/gm, '')).replace(/[\n\r]/g, '') || (comment.body || comment.text || '').trim();
                flairText = flairText.match(/\[.{0,62}\]/m) ? flairText.match(/\[.{0,62}\]/m)[0] : flairText;
                if (flairText.length <= 62 && !flairText.match(/^\[/)) { flairText = '[' + flairText; } /*Leading bracket*/
                if (flairText.length <= 63 && !flairText.match(/\]$/)) { flairText += ']'; } /*Trailing bracket*/

                return flairText.trim();
            },
            tiedReplies: function(replies) {
                let validReplies = replies.filter(flair.helpers.isValidReply);

                var highScore = Math.max.apply(null, validReplies.map(function(reply) {
                    return reply.score;
                }));

                var highScoreReplies = validReplies.filter(function(reply) {
                    return reply.score === highScore;
                });

                if (highScoreReplies.length > 1) {
                    highScoreReplies.forEach(function (reply) {
                        flair.helpers.getUser(reply.name).ties++;
                    });

                    /* Return the ties to be resolved */
                    return highScoreReplies;
                }

                /* There was no tie, so mark it a winner */
                highScoreReplies[0] && flair.set.winner(highScoreReplies[0]);
                return [];
            }
        },
        resolve: {
            ties: function () {
                if (!fdata.stream.hasOwnProperty('ties')) {
                    fdata.times.tieStart = new Date();
                    fdata.stream.ties = Object.keys(fdata.requests).filter(function (key) {
                        var request = fdata.requests[key];
                        request.ties = flair.parse.tiedReplies(request.replies);
                        return !!request.ties.length;
                    });
                    fdata.stats.ties = fdata.stream.ties.length;
                }

                if (fdata.stream.ties.length) {
                    flair.output.title('Resolving ties: ' + fdata.stream.ties.length + ' remaining');

                    var key = fdata.stream.ties[0];
                    var request = fdata.requests[key];
                    if (request && request.ties) {
                        var str = '<div>Resolving ties: ' + fdata.stream.ties.length + ' remaining</div>';
                        str += '<div class="parent_author">Flair for /u/' + request.name + ' has a tie. Choose a winner.</div>';
                        request.ties.forEach(function (reply, index) {
                            str += `<button class="tiebreaker ${reply.likes ? 'likes' : ''}" data-parent="${key}" data-index="${index}">` +
                                '<div><span class="author">/u/' + reply.name + '</span>  <span class="points">' + reply.score + ' points</span></div>' +
                                '<div class="text">' + reply.text + '</div>' +
                                '</button>';
                        });
                        flair.output.modal(str);
                        Array.from(document.getElementsByClassName('tiebreaker')).forEach(function (el) {
                            el.addEventListener('click', flair.resolve.tie);
                        });
                    } else {
                        alert('There weren\'t ties, but we have it marked as tied');
                    }
                    fdata.stream.ties.shift();
                } else {
                    flair.output.title('Ties resolved');
                    fdata.times.tieEnd = new Date();
                    flair.output.prepareData();

                    if (confirm('Would you like to set flairs?')) {
                        flair.set.flairs();
                    } else {
                        flair.output.summary();
                    }
                }
            },
            tie: function(event) {
                var el = event.currentTarget;
                var request = el.getAttribute('data-parent');
                var index = el.getAttribute('data-index');
                var reply = fdata.requests[request].replies[index];

                flair.set.winner(reply);
                flair.helpers.getUser(reply.name).tieWins++;

                var parentUser = flair.helpers.getUser(reply.parentName);
                if (! parentUser.attributes.includes(fdata.mapper.tied)) {
                    parentUser.attributes.push(fdata.mapper.tied);
                }

                flair.resolve.ties();
            }
        },
        output: {
            title: function (str) {
                document.title = str;
                flair.output.modal(str);
            },
            modal: function (str) {
                var output;
                if (!document.getElementById('flair-output')) {
                    output = document.createElement('div');
                    output.setAttribute('id', 'flair-output');
                    output.innerHTML = '<div>' + str + '</div>';
                    document.body.appendChild(output);
                } else {
                    output = document.getElementById('flair-output');
                    output.innerHTML = '<div>' + str + '</div>';
                }
            },
            summary: function () {
                fdata.times.fullEnd = new Date();

                var postBody = '#In this month\'s flair thread: \n\n';
                postBody += flair.output.main();
                postBody += '\n\n---\n\n';
                postBody += flair.output.stats();
                postBody += '\n\n---\n\n[Here\'s a link to the flair thread](/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + ')\n';

                var commentBody = 'Here\'s how much bias I had to specific users this month when resolving ties:\n\n';
                commentBody += flair.output.tieStats();

                var output = '<textarea id="postBody" style="white-space: nowrap; height: 50vh; width: 15vw;">' + postBody + '</textarea>';
                output += '<textarea id="commentBody" style="white-space: nowrap; height: 50vh; width: 15vw;">' + commentBody + '</textarea>';

                flair.output.title('Done');
                flair.output.modal(output);
            },
            prepareData: function () {
                Object.keys(fdata.requests).forEach(function(key) {
                    var request = fdata.requests[key];
                    flair.helpers.getUser(request.name).ids.push(request.id);
                    request.replies.forEach(function(reply) {
                        var user = flair.helpers.getUser(reply.name);
                        user.attempts.push(reply);
                        if (reply.winner) {
                            user.wins.push(reply);
                        }
                    });
                });

                fdata.stream.userArr = Object.keys(fdata.stream.users).map(function (username) {
                    var user = flair.helpers.getUser(username);
                    user.name = username;
                    user.score = user.wins.length * (user.wins.length / Math.max(1, user.attempts.length));
                    return user;
                })
                .sort(flair.helpers.sort.name)
                .sort(flair.helpers.sort.attempts)
                .sort(flair.helpers.sort.weight);
            },
            main: function() {
                var table = [
                    ['User','Wins','Tries','Score','Win Permalinks'],
                    [':--','--:','--:','--:',':--']
                ].concat(fdata.stream.userArr.filter(function (user) {
                        return !!user.attempts.length;
                    }).map(function (user) {
                        return [
                            flair.helpers.getLink(true, user),
                            user.wins.length,
                            user.attempts.length,
                            user.score.toFixed(2),
                            user.wins.sort(flair.helpers.sort.name)
                            .map(flair.helpers.getLink.bind(null, false)).join(', ')
                        ];
                    })
                );
                var mainTable = flair.helpers.table(table) +
                    '\n\n^(*Table sorted by weighted score desc, number of attempts asc, username asc*)\n\n';

                var moochers = '###Moochers\n\nThe users who requested flair, but didn\'t suggest any for anyone else.\n\n' +
                    fdata.stream.userArr.filter(function (user) {
                        return !user.attempts.length;
                    }).map(flair.helpers.getLink.bind(null, true))
                    .join(', ') +
                    '\n\n';

                var footnotes = '**Definitions**\n\n' +
                    '^(* had a tie that was resolved)    \n' +
                    (fdata.stats.newUsers ? '^(' + fdata.mapper.new + ' new user)    \n' : '') +
                    (fdata.stats.disabledUsers ? '^(' + fdata.mapper.disabled + ' users with flair disabled)    \n' : '') +
                    '^("Wins" are replies to flair requests that are highest voted at the thread close)    \n' +
                    '^("Tries" any reply to the flair requests)    \n' +
                    '^("Score" is the weighted score of `wins * wins / tries)`\n\n';

                return mainTable + moochers + footnotes;
            },
            stats: function () {
                var stats = [['\\#', 'Units', 'Summary'], ['--:', ':--', ':--']];
                stats.push(flair.helpers.getDiff(fdata.times.fullStart, fdata.times.fullEnd).concat(['Time to do everything']));
                stats.push(flair.helpers.getDiff(fdata.times.loadStart, fdata.times.loadEnd).concat(['Loaded all data']));
                stats.push([fdata.stats.moreLinksClicked, '', '"More" links loaded']);
                if (fdata.stats.moreLinksClicked) { stats.push(flair.helpers.getDiff(fdata.times.moreStart, fdata.times.moreEnd, fdata.stats.moreLinksClicked).concat(['Average "more" link load time'])); }
                stats.push([fdata.stats.requests, '', 'Flair requests']);
                stats.push([fdata.stats.attempts, '', 'Flair attempts']);
                stats.push([(fdata.stats.attempts / fdata.stats.requests).toFixed(2), '', 'Attempts per flair request']);
                stats.push([(fdata.stats.winscore / fdata.stats.requests).toFixed(2), '', 'Karma average per winning flair']);
                stats.push([(fdata.stats.attemptscore / fdata.stats.attempts).toFixed(2), '', 'Karma average per attempt']);
                if (fdata.stats.ties) {
                    stats.push([fdata.stats.ties, '', 'Requests ended in ties']);
                    stats.push([((fdata.stats.ties / fdata.stats.requests)*100).toFixed(1) + '%', '', 'Requests ended in ties']);
                    stats.push(flair.helpers.getDiff(fdata.times.tieStart, fdata.times.tieEnd).concat(['Time to resolve ties']));
                    stats.push(flair.helpers.getDiff(fdata.times.tieStart, fdata.times.tieEnd, fdata.stats.ties).concat(['Average time to resolve a single tie']));
                }
                if (fdata.times.applyStart && fdata.times.applyEnd) {
                    stats.push(flair.helpers.getDiff(fdata.times.applyStart, fdata.times.applyEnd).concat(['Time to set new flairs']));
                    stats.push(flair.helpers.getDiff(fdata.times.applyStart, fdata.times.applyEnd, fdata.stats.requests).concat(['Average time to set a single flair']));
                }
                if (fdata.stats.newUsers) { stats.push([fdata.stats.newUsers, '', 'Users requested flair for the first time']); }
                if (fdata.stats.disabledUsers) { stats.push([fdata.stats.disabledUsers, '', 'Users had their flair disabled when flair was applied']); }

                return '#Some stats:\n\n' + flair.helpers.table(stats) + '\n\n';
            },
            tieStats: function () {
                var tieStats = [
                    ['User', 'Win %', 'Wins', 'Ties', 'Weighted Score'],
                    [':--', '--:', '--:', '--:', '--:']
                ];
                tieStats = tieStats.concat(fdata.stream.userArr.filter(function (user) {
                    user.tiePercent = user.ties && (user.tieWins / user.ties);
                    user.tieScore = user.ties && user.tieWins * (user.tieWins / user.ties);
                    return !!user.ties;
                })
                .sort(flair.helpers.sort.name)
                .sort(function (a, b) {
                    return a.ties > b.ties ? 1 : (a.ties < b.ties ? -1 : 0);
                })
                .sort(function(a, b) {
                    return a.tieScore > b.tieScore ? -1 : (a.tieScore < b.tieScore ? 1 : 0);
                }).map(function(user) {
                    return [flair.helpers.escape(user.name), (user.tiePercent * 100).toFixed(1) + '%', user.tieWins, user.ties, user.tieScore.toFixed(2)];
                }));

                return flair.helpers.table(tieStats);
            }
        },
        helpers: {
            decode: function (str) {
                var txt = document.createElement("textarea");
                txt.innerHTML = str;
                return txt.value.trim();
            },
            escape: function (username) {
                return (username || '').replace(/_/g,'\\_');
            },
            sort: {
                name: function (a, b) {
                    var aName = a.parentName || a.name;
                    var bName = b.parentName || b.name;
                    return aName.toLowerCase() > bName.toLowerCase() ? 1 : (aName.toLowerCase() < bName.toLowerCase() ? -1 : 0);
                },
                attempts: function (a, b) {
                    return a.attempts.length > b.attempts.length ? 1 : (a.attempts.length < b.attempts.length ? -1 : 0);
                },
                weight: function (a, b) {
                    return a.score > b.score ? -1 : (a.score < b.score ? 1 : 0);
                }
            },
            getUser: function (username) {
                fdata.stream.users[username] = fdata.stream.users[username] || flair.helpers.blankUser();
                return fdata.stream.users[username];
            },
            blankUser: function() {
                return {
                    ties: 0,
                    tieWins: 0,
                    ids: [],
                    flairs: [],
                    attributes: [],
                    wins: [],
                    attempts: []
                };
            },
            table: function (data) {
                return data.map(function(row) {
                    return row.join('|');
                }).join('\n');
            },
            getLink: function (isRequest, comment) {
                var name = isRequest ? comment.name : comment.parentName;
                var len = comment.ids && comment.ids.length || 0;
                var str;
                if (len === 1) {
                    var id = comment.ids[0] + (!isRequest ? '?context=1' : '');
                    str = '[' + flair.helpers.escape(name) + '](/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/' + id + ')';
                    str += flair.helpers.getAttributes(name);
                } else {
                    str = flair.helpers.escape(name) + flair.helpers.getAttributes(name);
                    if (len) {
                        comment.ids.forEach(function(id, index) {
                            id += !isRequest ? '?context=1' : '';
                            str += ' [[' + index + ']](/r/' + r.config.cur_listing + '/comments/' + fdata.stream.threadId + '/x/' + id + ')';
                        });
                    }
                }
                return str.trim();
            },
            getAttributes: function(name) {
                var user = flair.helpers.getUser(name);
                return ' ' + (user && user.attributes ? user.attributes.join('') : '');
            },
            getDiff: function(startTime, endTime, averageCount) {
                var diff = endTime.getTime() - startTime.getTime();
                if (averageCount) {
                    diff = diff / averageCount;
                }

                if (diff/1000 < 60) { /* Less than a minute */
                    return [(diff/1000).toFixed(2),'seconds'];
                }
                diff = Math.round(diff / 1000);
                return [Math.floor(diff / 60) + ':' + ('0' + (diff % 60)).slice(-2), 'minutes'];
            },
            isValidReply: function(comment) {
                let text = flair.parse.flairText(comment);
                return !flair.helpers.isRemoved(comment) && text.length <= 64;
            },
            isRemoved: function(comment) {
                return comment.removed || comment.spam || comment.banned_by;
            }
        }
    };

    flair.setup.init();
})();
