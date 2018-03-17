javascript: (function () {
  window.fml = {
    /* Settings you may want to edit */
    staleThreshold: 5, /* Number of days before a post is considered too old to the scraper */
    autoProjection: 50000, /* If we don't have a projection, how many $ should we give it per FML bux */
    targets: { /* Modify the numbers on the right for how much to adjust each site's scraped projections (1 = no change) */
      'fml':  ['http://fantasymovieleague.com',                                 0.977],
      'mojo': ['http://www.boxofficemojo.com/news/',                            0.957],
      'pro':  ['http://pro.boxoffice.com/category/boxoffice-forecasts/',        0.954],
      'rep':  ['http://www.boxofficereport.com/predictions/predictions.html',   0.953],
      'bop':  ['http://www.boxofficeprophets.com/',                             0.942],
    },
    weekendWeight: { /* This is how much to weight each day of a movie that is split into separate days */
      '3': { /* 3 day weekend */
        'FRI': .4184,
        'SAT': .3309,
        'SUN': .2507
      },
      '4': { /* 4 day weekend */
        'FRI': .311,
        'SAT': .2793,
        'SUN': .2798,
        'MON': .1298
      }
    },
    /* End Settings */

    data: { },
    formdata: { },
    handlers: {
      prompt: function (ostr) {
        var forceAlert = ostr ? true : false;
        str = (ostr ? ostr : '') + 'Where would you like to go?';
        var optionsstr = '';
        for (var key in fml.targets) {
          if (fml.targets.hasOwnProperty(key)) {
            host = (fml.targets[key][0]).replace(/https?:\/\//, '').replace(/\.com.*/, '.com');
            if ((!fml.data[key] && document.location.hostname !== host) || key === 'fml') {
              optionsstr += '\n\u2022 ' + key + ': ' + host;
            }
          }
        }
        if (optionsstr.split('\n').length > 2) {
          fml.handlers.navigate(prompt(str + optionsstr, 'fml'));
        } else {
          if (forceAlert) {
            alert(ostr);
          }
          fml.handlers.navigate('fml');
        }
      },
      navigate: function (target) {
        if (fml.targets[target]) {
          var separator = target === 'fml' ? '?' : '#';
          document.location.href = fml.targets[target][0] +
            (JSON.stringify(fml.data) != '{}' ?
              separator + 'data=' + encodeURIComponent(JSON.stringify(fml.data)) :
              '');
        } else {
          alert('That isn\'t one of the options');
        }
      },
      setupDom: function () {
        if (!document.querySelectorAll('.cineplex__bd .fml-calc').length) {
          var calc = document.createElement('div');
          calc.className = 'fml-calc';
          document.querySelectorAll('.cineplex__bd')[0].appendChild(calc);
          var output = document.createElement('div');
          output.className = 'output';
          calc.appendChild(output);
          var form = document.createElement('form');
          form.className = 'calc-form';
          form.addEventListener("submit", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            return false;
          }, true);
          calc.appendChild(form);

          var styles = document.createElement('style');
          styles.innerHTML += '.cineplex .is-locked-message-wrap, .cineplex.is-locked .is-locked-message { max-height: 670px } ';
          styles.innerHTML += '.fml-calc { padding: 1em 0; margin-top: 3em } ';
          styles.innerHTML += '.fml-calc a { cursor: pointer; color: #09f; font-size: .8em; display: block; text-align: center; } ';
          styles.innerHTML += '.fml-calc a:hover { text-decoration: underline; } ';
          styles.innerHTML += '.fml-calc::before, .fml-calc::after { content: ""; display: block; clear: both } ';
          styles.innerHTML += '.fml-calc .output { float: left; color: #ddd; margin-bottom: 1em; margin-right: 1em; margin-top: -10px; padding-top: 10px; padding-right: 1em; border-right: 1px solid #9a1b57; } ';
          styles.innerHTML += '.fml-calc .output>div { float: left; clear: left; opacity: .2; transition: .3s all ease-in-out } ';
          styles.innerHTML += '.fml-calc .output>div:first-of-type, .fml-calc .output>div:hover { opacity: 1 } ';
          styles.innerHTML += '.fml-calc .output>div:first-of-type { margin-bottom: 2em; border-bottom: 1px solid #9a1c57; } ';
          styles.innerHTML += '.fml-calc .output>p { float: left; width: 50%; } ';
          styles.innerHTML += '.fml-calc .output svg { position: relative; left: 7.5%; top: -15px; } ';
          styles.innerHTML += '.fml-calc .output>div+p { clear: left; } ';
          styles.innerHTML += '.fml-calc .output .img { float: left; margin-bottom: .2em; box-sizing: content-box; border-radius: 4px; position: relative; width: 86px; min-height: 48px } ';
          styles.innerHTML += '.fml-calc .output .img img { width: 86px; float: left; height: 48px; object-fit: cover; } ';
          styles.innerHTML += '.fml-calc .output .img:hover::before, .fml-calc .output .img:focus::before, .fml-calc .output .img:active::before, ' +
            '.fml-calc .output .img:hover::after, .fml-calc .output .img:focus::after, .fml-calc .output .img:active::after { content: attr(data-title); position: absolute; top: -5em; left: 50%; font-size: 12px; background: #222; padding: .5em; white-space: nowrap; transform: translate(-50%,0); } ';
          styles.innerHTML += '.fml-calc .output .img:hover::after, .fml-calc .output .img:focus::after, .fml-calc .output .img:active::after { content: attr(data-stats); top: -3em; } ';
          styles.innerHTML += '.fml-calc .output .img.bestvalue:hover::before, .fml-calc .output .img.bestvalue:focus::before, .fml-calc .output .img.bestvalue:active::before { content: attr(data-title) " (Best Performer)";} ';
          styles.innerHTML += '.fml-calc .output .img.bestvalue { box-shadow: 0 0 20px #38ff38; border-bottom: 5px solid #38ff38; } ';
          styles.innerHTML += '.fml-calc .output .img + .img { margin-left: .5em; } ';
          styles.innerHTML += '@media (max-width: 1029px) { .fml-calc .output .img:nth-child(5) {clear: left; margin-left: 0; }} ';
          styles.innerHTML += '.fml-calc .output>p~div .img { box-shadow: none !important; } ';
          styles.innerHTML += '.fml-calc .output .img.defaultProjection { box-shadow: 0 0 20px #9a1c57 !important; } ';
          styles.innerHTML += '.fml-calc .output h2 { float: left; clear: left } ';
          styles.innerHTML += '.fml-calc .output span { float: right; font-size: 1.6em; font-weight: bold; margin-bottom: 0.4em; } ';
          styles.innerHTML += '.fml-calc .calc-form { float: left; color: #fff; margin-top: -18px; } ';
          styles.innerHTML += '.fml-calc .calc-form label, .fml-calc .calc-form input { display: block; text-align: right } ';
          styles.innerHTML += '.fml-calc .calc-form label { font-size: 12px; margin: 0 0 .3em; text-align: center; position: relative } ';
          styles.innerHTML += '.fml-calc .calc-form label .projections { display: none; min-width: 8em; position: absolute; left: 100%; background: #222; padding: .5em; white-space: nowrap; transform: translate(0, -50%); top: 50%; text-align: left; } ';
          styles.innerHTML += '.fml-calc .calc-form label .projections .title { font-size: 1.2em; margin-bottom: .5em; display: inline-block; } ';
          styles.innerHTML += '.fml-calc .calc-form label .projections li { clear: both; } ';
          styles.innerHTML += '.fml-calc .calc-form label .projections li span:first-child { float: left;  } ';
          styles.innerHTML += '.fml-calc .calc-form label .projections li span:last-child { float: right; padding-left: 1em; box-sizing: border-box; } ';
          styles.innerHTML += '.fml-calc .calc-form label:hover .projections { display: block } ';
          styles.innerHTML += '.fml-calc .calc-form label.noProjection { color: #f66; } ';
          styles.innerHTML += '.fml-calc .calc-form input { background: rgba(255,255,255,.2); color: #fff } ';
          styles.innerHTML += '.fml-calc .calc-form input::-webkit-outer-spin-button, .fml-calc .calc-form input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0 } ';
          styles.innerHTML += '.fml-calc .calc-form input, .fml-calc .calc-form button { display: inline-block; height: 25px; vertical-align: top; width: 130px; border: 0; padding: .2em .5em; font-family: monospace } ';
          styles.innerHTML += '.fml-calc .calc-form button { font-family: inherit; font-weight: bold; cursor: pointer; width: auto } ';
          styles.innerHTML += '.fml-calc .calc-form>div { text-align: center; margin-bottom: 1em } ';
          styles.innerHTML += '.fml-calc .calc-form>button { border-radius: 4px; background: #38ff38; margin: 1.5em 0; font-size: 1em; width: 100% } ';
          document.head.appendChild(styles);

          var script = document.createElement('script');
          script.onload = function () {
            window.google = google;
            window.google.charts.load('current', {
              'packages': ['corechart']
            });
            window.google.charts.setOnLoadCallback(fml.handlers.addCharts);
          };
          script.setAttribute('src', 'https://www.gstatic.com/charts/loader.js');
          document.head.appendChild(script);
        }
        calcform = document.querySelectorAll('.fml-calc .calc-form')[0];
        calcform.innerHTML = '';
        for (var i = 0; i < fml.formdata.length; i++) {
          if (fml.formdata[i].bux >= 0) {
            labelStr = '<label ' + (!fml.formdata[i].hasProjection ? 'class="noProjection" title="Autofilled projection data"' : 'class="hasProjection"') + ' for="calc-' + i + '">';

            if (fml.formdata[i].hasProjection) {
              labelStr += '<span class="projections"><span class="title">'
                + fml.formdata[i].title + ' ' + fml.formdata[i].day + '</span><ul>';
              for (key in fml.data) {
                if (fml.data.hasOwnProperty(key)) {
                  for (innerkey in fml.data[key]) {
                    if (innerkey === fml.formdata[i].code) {
                      projected = Math.round(fml.data[key][innerkey] / 100000) / 10;
                      labelStr += '<li><span>'+key+'</span><span>$' + projected.toFixed(1) + 'M</span></li>';
                    }
                  }
                }
              }
              labelStr += '</ul></span>';
            }

            labelStr += fml.formdata[i].title + ' ' + fml.formdata[i].day +
              (!fml.formdata[i].hasProjection ? '*' : '');
            labelStr += '</label>';
            calcform.innerHTML += labelStr;

            calcform.innerHTML += '<div>' +
              '<button title="Subtract 10% from value" onclick="fml.handlers.modifyProjected(this,-10)">-</button>' +
              '<input id="calc-' + i + '" name="' + fml.formdata[i].code + '" value="' + fml.formdata[i].projected + '" type="number" />' +
              '<button title="Add 10% to value" onclick="fml.handlers.modifyProjected(this,10)">+</button>' +
              '</div>';
          }
        }
        calcform.innerHTML += '<button onclick="fml.handlers.recalculate()">Recalculate</button>';
        calcform.innerHTML += '<a onclick="fml.handlers.copy()">Copy Projections</a>';
      },
      copy: function () {
        var copyText = document.createElement('textarea'),
          str = "My projections for this weekend:\r\n\r\nMovie|Projected\r\n:--|--:\r\n",
          projected = 0;
        document.querySelectorAll('.cineplex__bd')[0].appendChild(copyText);
        var top10 = fml.formdata.sort(function (a, b) {
          aprojected = a.projected - (a.bestValue ? 2000000 : 0);
          bprojected = b.projected - (b.bestValue ? 2000000 : 0);
          return aprojected < bprojected ? 1 :
            (aprojected > bprojected ? -1 : 0);
        });

        for (var key in top10.slice(0, 10)) {
          projected = top10[key].projected - (top10[key].bestValue ? 2000000 : 0);
          projected = Math.round(projected / 100000) / 10;
          if (projected >= 0) {
            str += top10[key].title + '|';
            str += '$' + projected.toFixed(1) + "M\r\n";
          }
        }

        copyText.value = str;
        copyText.select();
        document.execCommand("Copy");
        copyText.parentNode.removeChild(copyText);
      },
      recalculate: function () {
        fml.helpers.reparseVariables();
        window.variations = [];
        fml.helpers.getVariation([], 1000);

        document.querySelectorAll('.fml-calc .output')[0].innerHTML = '';

        fml.handlers.placeLineups();
        fml.handlers.addCharts();
        document.getElementsByTagName('html')[0].scrollTop =
          document.querySelectorAll('.fml-calc')[0].getBoundingClientRect().y +
          document.getElementsByTagName('html')[0].scrollTop - 100;
      },
      addCharts: function () {
        if (typeof window.google === 'undefined') {
          return false;
        }
        var performanceData = [
            ['Movie', '$/bux']
          ],
          performanceChart = document.createElement('p'),
          projectedData = [
            ['Movie', 'min', 'max', 'projected']
          ],
          projectedChart = document.createElement('p'),
          options = { title: 'Dollars per FML bux', backgroundColor: 'transparent', titleTextStyle: { color: '#fff' }, hAxis: { textStyle: { color: '#fff' }, titleTextStyle: { color: '#fff' } }, vAxis: { textStyle: { color: '#fff' }, titleTextStyle: { color: '#fff' } }, legend: { position: 'none', textStyle: { color: '#fff' } } };

        var performanceOptions = JSON.parse(JSON.stringify(options)),
          projectedOptions = JSON.parse(JSON.stringify(options));

        projectedOptions.title = 'Weekend Projections';
        projectedOptions.seriesType = 'bars';
        projectedOptions.series = { 2: { type: 'line' } };

        performanceChart.setAttribute('id', 'performancechart');
        projectedChart.setAttribute('id', 'projectedchart');
        document.querySelectorAll('.fml-calc .output')[0].insertBefore(performanceChart, document.querySelectorAll('.fml-calc .output')[0].childNodes[1]);
        document.querySelectorAll('.fml-calc .output')[0].insertBefore(projectedChart, document.querySelectorAll('.fml-calc .output')[0].childNodes[1]);

        for (var key in fml.formdata) {
          if (fml.formdata[key].title && fml.formdata[key].projected >= 0) {
            var min = 9000000000, max = 0;
            for (datakey in fml.data) {
              for (innerkey in fml.data[datakey]) {
                if (fml.formdata[key].code == innerkey) {
                  min = Math.min(min, fml.data[datakey][innerkey]);
                  max = Math.max(max, fml.data[datakey][innerkey]);
                }
              }
            }
            min = min === 9000000000 ? 0 : min;
            projectedData.push([
              fml.formdata[key].title + ' ' + fml.formdata[key].day,
              min,
              max,
              fml.formdata[key].projected
            ]);
            performanceData.push([
              fml.formdata[key].title + ' ' + fml.formdata[key].day,
              fml.formdata[key].dollarperbux
            ]);
          }
        }
        var data = window.google.visualization.arrayToDataTable(projectedData);
        var chart = new window.google.visualization.ComboChart(document.getElementById('projectedchart'));
        chart.draw(data, projectedOptions);

        var data = window.google.visualization.arrayToDataTable(performanceData);
        var chart = new window.google.visualization.ColumnChart(document.getElementById('performancechart'));
        chart.draw(data, performanceOptions);
      },
      placeLineups: function () {
        var bestVariations = window.variations.slice().sort(function (a, b) {
          var aproj = a[a.length - 1].projected,
            bproj = b[b.length - 1].projected;
          return aproj > bproj ? -1 : (aproj < bproj ? 1 : 0);
        }).slice(0, 7);
        for (var l = 0; l < bestVariations.length; l++) {
          var lineup = bestVariations[l],
            variation = document.createElement('div');
          for (var i = 0; i < lineup.length; i++) {
            if (lineup[i].title != 'info') {
              variation.innerHTML +=
                '<span class="img' + (lineup[i].bestValue ? ' bestvalue' : '') + (!lineup[i].hasProjection ? ' defaultProjection' : '') + '" data-title="' + lineup[i].title + ' ' + lineup[i].day + '" ' +
                'data-stats="' + Number(lineup[i].dollarperbux).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).slice(0, -3) + '/bux | ' +
                Number(lineup[i].projected).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).slice(0, -3) +
                '"><img src="' + lineup[i].img + '"/></span>';
            } else {
              variation.innerHTML +=
                '<h2>' + lineup[i].bux + ' bux remaining</h2>' +
                '<span>' + Number(lineup[i].projected).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).slice(0, -3) + '</span>';
            }
          }
          document.querySelectorAll('.fml-calc .output')[0].appendChild(variation);
        }
      },
      modifyProjected: function (element, value) {
        var input = element.parentElement.getElementsByTagName('input')[0],
          inputVal = parseFloat(input.value);
        input.value = Math.round(inputVal * ((100 + value) / 100));
      }
    },
    helpers: {
      detectPath: function () {
        if (fml.helpers.path[document.location.hostname]) {
          fml.data = !!document.location.href.match(/[\#\?]data=/) ?
            JSON.parse(decodeURIComponent(document.location.href.replace(/.*?[\#\?]data=/, ''))) : {};
          fml.helpers.path[document.location.hostname]();
        } else {
          fml.handlers.prompt();
        }
      },
      path: {
        'fantasymovieleague.com': function () {
          if (document.location.href.match('news')) {
            var items = document.querySelectorAll('.news-item h5 a');
            for (var key in items) {
              if (items[key].getAttribute('title').match(/Estimates/i)) {
                document.location.href = items[key].getAttribute('href') +
                  '?data=' + encodeURIComponent(JSON.stringify(fml.data));
                break;
              }
            }
          } else if (document.location.href.match('posts')) {
            var postText = document.querySelectorAll('.post__content')[0].textContent,
              predictions = postText.match(/.*?\$[\d\.,]+( million)?/gi);
            fml.data.fml = {};
            for (var i = 0; i < predictions.length; i++) {
              var title = predictions[i].match(/(?<=").+(?=")/)[0];
              var projected = parseFloat(predictions[i].match(/(?<=\$).+/)[0].replace(/[,\.]/g, '').replace(/ ?million/i, '00000'));
              fml.data.fml[fml.helpers.cleanTitle(title)] = projected;
            }
            fml.handlers.prompt("\u2714 Grabbed data from fantasymovieleague!\n\n");
          } else {
            window.fml.formdata = fml.helpers.parseFMLData(fml.helpers.flattenData(fml.data));
            fml.handlers.setupDom();
            fml.handlers.recalculate();
          }
        },
        'pro.boxoffice.com': function () {
          if (document.getElementsByTagName('body')[0].className.match('category')) {
            var links = document.getElementsByTagName('h3');
            for (var i = 0; i < links.length; i++) {
              var dateStr = links[i].parentNode.querySelectorAll('.date')[0],
                date = new Date(dateStr.innerHTML),
                today = (new Date()).setHours(0, 0, 0, 0);

              if (links[i].getElementsByTagName('a')[0].innerHTML.match('Weekend')) {
                if (today - date < fml.staleThreshold * 24 * 60 * 60 * 1000) {
                  document.location.href = links[i].getElementsByTagName('a')[0].getAttribute('href') +
                    '#data=' + encodeURIComponent(JSON.stringify(fml.data));
                } else {
                  fml.handlers.prompt("\u274C boxofficepro hasn\'t posted yet.\n\n");
                }
                break;
              }
            }
          } else if (document.getElementsByTagName('body')[0].className.match('single')) {
            var post = document.getElementsByClassName('post-container')[0],
              rows = Array.from(post.getElementsByTagName('tbody')[0].getElementsByTagName('tr')).slice(1),
              nameCol = 0,
              projectedCol = 2;
            fml.data.pro = {};
            for (var key in rows) {
              var row = rows[key];
              fml.data.pro[fml.helpers.cleanTitle(row.getElementsByTagName('td')[nameCol].innerHTML)] =
                parseFloat(row.getElementsByTagName('td')[projectedCol].innerHTML.replace(/\D/g, ''));
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficepro!\n\n");
          }
        },
        'www.boxofficereport.com': function () {
          var dateStr = document.querySelectorAll('h5')[0].innerHTML.replace(/Published on /mi, '').replace(/ at(.|\r|\n)*/i, ''),
            date = new Date(dateStr),
            today = (new Date()).setHours(0, 0, 0, 0);
          if (today - date < fml.staleThreshold * 24 * 60 * 60 * 1000) {
            var options = Array.from(document.querySelectorAll('h4>table.inlineTable:nth-child(1) tr')).slice(1);
            fml.data.rep = {};
            for (var key in options) {
              var row = options[key],
                movie = row.getElementsByTagName('td')[1].innerHTML.replace(/<.*?>/g, '').replace(/\(.*?\)/g, ''),
                projected = parseFloat(row.getElementsByTagName('td')[2].innerHTML.replace(/[^\d\.]/g, '')) * 1000000;
              movie = fml.helpers.cleanTitle(movie);
              fml.data.rep[movie] = projected;
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficereport!\n\n");
          } else {
            fml.handlers.prompt("\u274C boxofficereport hasn\'t posted yet.\n\n");
          }
        },
        'www.boxofficemojo.com': function () {
          if (document.location.href.match('boxofficemojo.com/news/') && !document.location.href.match('id=')) {
            var rows = Array.from(document.querySelectorAll('ul.nav_tabs ~ table table')[0].getElementsByTagName('tr')).slice(1);
            for (var i = 0; i < rows.length; i++) {
              var dateStr = rows[i].querySelectorAll('td>font>b')[0],
                date = new Date(dateStr.innerHTML),
                today = (new Date()).setHours(0, 0, 0, 0);

              if (date.getDay() == 4) {
                if (today - date < fml.staleThreshold * 24 * 60 * 60 * 1000) {
                  document.location.href = rows[i].getElementsByTagName('a')[0].getAttribute('href') +
                    '#data=' + encodeURIComponent(JSON.stringify(fml.data));
                } else {
                  fml.handlers.prompt("\u274C boxofficemojo hasn\'t posted yet.\n\n");
                }
                break;
              }
            }
          } else if (document.location.href.match('boxofficemojo.com/news/') && !!document.location.href.match('id=')) {
            var forecasts = document.querySelectorAll('h1 ~ ul'),
              movies = forecasts[forecasts.length - 1].getElementsByTagName('b'),
              vals = forecasts[forecasts.length - 1].getElementsByTagName('li');

            fml.data.mojo = {};
            for (var i = 0; i < movies.length; i++) {
              fml.data.mojo[fml.helpers.cleanTitle(movies[i].innerHTML)] =
                parseFloat(vals[i].innerHTML.replace(/.*? - \$/, '').replace(/[^\d\.]/g, '')) * 1000000;
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficemojo!\n\n");
          }
        },
        'www.boxofficeprophets.com': function () {
          if (document.location.href.match('column')) {
            var tables = document.querySelectorAll('#EchoTopic table');
            var projections = tables[tables.length - 1].querySelectorAll('tr[bgcolor*="eee"]');
            fml.data.bop = {};
            for (var i = 0; i < projections.length; i++) {
              fml.data.bop[fml.helpers.cleanTitle(projections[i].querySelectorAll('td')[1].textContent)] =
                parseFloat(projections[i].querySelectorAll('td')[4].textContent.replace(/[^\d\.]/g, '')) * 1000000;
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficeprophets!\n\n");
          } else {
            var headings = document.querySelectorAll('td>a[href*="column/index.cfm?columnID="] strong');
            for (var key in headings) {
              if (headings[key].innerHTML && headings[key].innerHTML.trim().toLowerCase() === 'weekend forecast') {
                var postedDate = headings[key].closest('table').querySelectorAll('font[color="black"] strong'),
                  date = postedDate.length ? new Date(postedDate.textContent) : (new Date()).setHours(0, 0, 0, 0),
                  today = (new Date()).setHours(0, 0, 0, 0);
                if (today - date < fml.staleThreshold * 24 * 60 * 60 * 1000) {
                  document.location.href = headings[key].closest('a').getAttribute('href') +
                    '#data=' + encodeURIComponent(JSON.stringify(fml.data));
                  break;
                } else {
                  fml.handlers.prompt("\u274C boxofficeprophets hasn\'t posted yet.\n\n");
                }
              }
            }
          }
        }
      },
      flattenData: function (projectedData) {
        var tempArr = {},
          returnArr = {};
        for (var source in projectedData) {
          for (var movie in projectedData[source]) {
            tempArr[movie] = tempArr[movie] ? tempArr[movie] : {
              sum: 0,
              count: 0
            };
            tempArr[movie].sum += projectedData[source][movie] * fml.targets[source][1];
            tempArr[movie].count ++;
          }
        }
        for (var movie in tempArr) {
          returnArr[movie] = Math.round(tempArr[movie].sum / tempArr[movie].count);
        }
        return returnArr;
      },
      cleanTitle: function (titleStr) {
        return titleStr.replace(/\b(a|an|the)\b/i, '').replace(/\W/g, '').toLowerCase();
      },
      parseFMLData: function (projectedData) {
        var movies = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .outer-wrap'),
          titles = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .title'),
          imgs = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .proxy-img'),
          bux = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .cost-wrap');
        var fmlData = [];
        var numdays = eval(document.querySelectorAll(".cineplex__bd-week_details .cineplex-details-name-value.first strong")[0].innerHTML.replace(/[a-z]/gi, '')) * -1 + 1;

        for (var i = 0; i < movies.length; i++) {
          var title = titles[i].innerHTML.trim(),
            img = imgs[i].getAttribute('data-img-src');
          var day = title.match(/ONLY$/) ?
            title.substring(0, 3) :
            '';
          var cost = parseFloat(bux[i].childNodes[bux[i].childNodes.length - 1].nodeValue);;
          if (day) {
            title = title.replace(/^\w{3} - /, '').replace(/ - \w{3} ONLY$/, '');
          }
          var code = fml.helpers.cleanTitle(title);

          var projected = projectedData[code],
            hasProjection = !!projected;
          if (!hasProjection) {
            projected = cost * fml.autoProjection;
            movies[i].setAttribute('style', 'border: 1px solid #f00');
          }

          if (day) {
            projected = Math.round(projected * fml.weekendWeight[numdays][day]);
          }

          fmlData.push({
            'code': code + day.toLowerCase(),
            'img': img,
            'title': title,
            'day': day,
            'projected': projected,
            'hasProjection': hasProjection,
            'bux': cost
          });
        }

        fmlData.push({
          'code': 'empty',
          'img': 'https://i.imgur.com/dExP98u.png',
          'title': 'Empty',
          'projected': -2000000,
          'day': '',
          'bux': 0
        });

        return fmlData;
      },
      reparseVariables: function () {
        var myform = document.querySelectorAll('.fml-calc .calc-form')[0],
          formVars = Array.from(new FormData(myform), e => e.map(encodeURIComponent)),
          bestValue = 0;
        for (var movie in fml.formdata) {
          for (var i = 0; i < formVars.length; i++) {
            if (fml.formdata[movie].code == formVars[i][0]) {
              fml.formdata[movie].projected = parseFloat(formVars[i][1]);
              bestValue = Math.max((fml.formdata[movie].projected / fml.formdata[movie].bux), bestValue);
            }
          }
        }
        for (var movie in fml.formdata) {
          fml.formdata[movie].dollarperbux = (fml.formdata[movie].projected / fml.formdata[movie].bux);
          fml.formdata[movie].bestValue = fml.formdata[movie].dollarperbux >= bestValue;
        }
      },
      getVariation: function (passedLineup, bux) {
        if (passedLineup.length < 8) {
          for (var m = 0; m < fml.formdata.length; m++) {
            var lineup = passedLineup.slice();
            var movie = fml.formdata[m],
              prevBux = lineup.length ? lineup[lineup.length - 1].bux : 1000,
              tooExpensive = bux - movie.bux < 0,
              cheaperThanPrevious = movie.bux <= prevBux;

            if (!tooExpensive && cheaperThanPrevious && lineup.length < 8) {
              lineup.push(movie);
              fml.helpers.getVariation(lineup, bux - movie.bux);
            }
          }
        } else {
          var lineup = passedLineup.slice();
          lineup.push(fml.helpers.getInfo(passedLineup));
          window.variations.push(lineup);
        }
      },
      getInfo: function (vlineup) {
        var projected = 0,
          bux = 1000;
        for (var i = 0; i < vlineup.length; i++) {
          projected += vlineup[i].projected;
          projected += vlineup[i].bestValue ? 2000000 : 0;
          bux -= vlineup[i].bux;
        }
        return {
          'title': 'info',
          'projected': projected,
          'bux': bux,
        };
      }
    }
  };
  fml.helpers.detectPath();
})();
