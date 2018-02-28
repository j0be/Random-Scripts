javascript: (function () {
  window.fml = {
    data: {/* raw data */},
    formdata: {/* finessed a bit */},
    targets: {
      'fml':'http://fantasymovieleague.com',
      'bop':'http://pro.boxoffice.com/category/boxoffice-forecasts/',
      'bom':'http://www.boxofficemojo.com/news/',
      'bor':'http://www.boxofficereport.com/predictions/predictions.html'
    },
    weekendWeight: {
      '3': { 'FRI': .4184, 'SAT': .3309, 'SUN': .2507 },
      '4': { 'FRI': .311, 'SAT': .2793, 'SUN': .2798, 'MON': .1298 }
    },
    staleThreshold: 4,
    handlers: {
      prompt: function (str) {
        str = (str ? str : '') + 'Where would you like to go?';
        var optionsstr = '';
        for (var key in fml.targets) { if (fml.targets.hasOwnProperty(key)) {
          host = (fml.targets[key]).replace(/https?:\/\//, '').replace(/\.com.*/, '.com');
          if (!fml.data[key] && document.location.hostname !== host) {
            optionsstr += '\n\u2022 ' + key + ': ' + host;
          }
        }}
        if (optionsstr != '') {
          fml.handlers.navigate(prompt(str + optionsstr, 'fml'));
        } else {
          fml.handlers.navigate('fml');
        }
      },
      navigate: function (target) {
        if (fml.targets[target]) {
          document.location.href = fml.targets[target] +
            (JSON.stringify(fml.data) != '{}' ?
              '#data=' + encodeURIComponent(JSON.stringify(fml.data)) :
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
          styles.innerHTML += '.fml-calc::before, .fml-calc::after { content: ""; display: block; clear: both } ';
          styles.innerHTML += '.fml-calc .output { float: left; color: #ddd; margin-bottom: 1em; margin-right: 1em; padding-right: 1em; border-right: 1px solid #9a1b57; } ';
          styles.innerHTML += '.fml-calc .output>div { float: left; clear: left; opacity: .2; transition: .3s all ease-in-out } ';
          styles.innerHTML += '.fml-calc .output>div:first-child, .fml-calc .output>div:hover { opacity: 1 } ';
          styles.innerHTML += '.fml-calc .output>div:first-child { margin-bottom: 2em; border-bottom: 1px solid #9a1c57; } ';
          styles.innerHTML += '.fml-calc .output img { box-shadow: 0 0 20px #9a1c57; width: 86px; float: left; margin-bottom: .2em; box-sizing: content-box; border-radius: 4px } ';
          styles.innerHTML += '.fml-calc .output img.bestvalue { box-shadow: 0 0 20px #38ff38; border-bottom: 5px solid #38ff38; } ';
          styles.innerHTML += '.fml-calc .output img + img { margin-left: .5em; } ';
          styles.innerHTML += '@media (max-width: 1029px) { .fml-calc .output img:nth-child(5) {clear: left; margin-left: 0; }} ';
          styles.innerHTML += '.fml-calc .output>div+div img { box-shadow: none !important; } ';
          styles.innerHTML += '.fml-calc .output h2 { float: left; clear: left } ';
          styles.innerHTML += '.fml-calc .output span { float: right; font-size: 1.6em; font-weight: bold; margin-bottom: 0.4em; } ';
          styles.innerHTML += '.fml-calc .calc-form { float: left; color: #fff; margin-top: -18px; } ';
          styles.innerHTML += '.fml-calc .calc-form label, .fml-calc .calc-form input { display: block; text-align: right } ';
          styles.innerHTML += '.fml-calc .calc-form label { font-size: 12px; margin: 0 0 .3em; text-align: center } ';
          styles.innerHTML += '.fml-calc .calc-form label.noProjection { color: #f66; } ';
          styles.innerHTML += '.fml-calc .calc-form input { background: rgba(255,255,255,.2); color: #fff } ';
          styles.innerHTML += '.fml-calc .calc-form input, .fml-calc .calc-form button { display: inline-block; height: 25px; vertical-align: top; width: 130px; border: 0; padding: .2em .5em; font-family: monospace } ';
          styles.innerHTML += '.fml-calc .calc-form button { font-family: inherit; font-weight: bold; cursor: pointer; width: auto } ';
          styles.innerHTML += '.fml-calc .calc-form>div { text-align: center; margin-bottom: 1em } ';
          styles.innerHTML += '.fml-calc .calc-form>button { border-radius: 4px; background: #38ff38; margin: 1.5em 0; font-size: 1em; width: 100% } ';
          document.querySelectorAll('head')[0].appendChild(styles);
        }
        calcform = document.querySelectorAll('.fml-calc .calc-form')[0];
        calcform.innerHTML = '';
        for (var i = 0; i < fml.formdata.length; i++) {
          if (fml.formdata[i].bux > 0) {
            calcform.innerHTML += '<label ' + (!fml.formdata[i].hasProjection ? 'class="noProjection" title="Autofilled projection data"' : '')+' for="calc-' + i + '">' + 
              fml.formdata[i].title + ' ' + fml.formdata[i].day + 
              (!fml.formdata[i].hasProjection ? '*':'') +
            '</label>';
            calcform.innerHTML += '<div>' +
              '<button title="Subtract 10% from value" onclick="fml.handlers.modifyProjected(this,-10)">-</button>' +
              '<input id="calc-' + i + '" name="' + fml.formdata[i].code + '" value="' + fml.formdata[i].projected + '" />' +
              '<button title="Add 10% to value" onclick="fml.handlers.modifyProjected(this,10)">+</button>' +
            '</div>';
          }
        }
        calcform.innerHTML += '<button onclick="fml.handlers.recalculate()">Recalculate</button>';
      },
      recalculate: function () {
        fml.helpers.reparseVariables();
        window.variations = [];
        fml.helpers.getVariation([], 1000);

        var bestVariations = window.variations.slice().sort(function (a, b) {
          var aproj = a[a.length - 1].projected,
            bproj = b[b.length - 1].projected;
          return aproj > bproj ? -1 : (aproj < bproj ? 1 : 0);
        }).slice(0, 10);
            

        document.querySelectorAll('.fml-calc .output')[0].innerHTML = '';
        for (var l = 0; l < bestVariations.length; l++) {
          var lineup = bestVariations[l],
            variation = document.createElement('div');
          for (var i = 0; i < lineup.length; i++) {
            if (lineup[i].title != 'info') {
              variation.innerHTML +=
                '<img ' + (lineup[i].bestValue ? 'class="bestvalue" ' : '') +
                'src="' + lineup[i].img + '" title="' + lineup[i].title + ' ' + lineup[i].day + ' | ' +
                Number(lineup[i].dollarperbux).toLocaleString('en-US', { style: 'currency', currency: 'USD' }).slice(0, -3) + '/bux | ' +
                Number(lineup[i].projected).toLocaleString('en-US', { style: 'currency', currency: 'USD' }).slice(0, -3) +
                '"/>';
            } else {
              variation.innerHTML +=
                '<h2>' + lineup[i].bux + ' bux remaining</h2>' +
                '<span>' + Number(lineup[i].projected).toLocaleString('en-US', { style: 'currency', currency: 'USD' }).slice(0, -3) + '</span>';
            }
          }
          document.querySelectorAll('.fml-calc .output')[0].appendChild(variation);
        }
        document.getElementsByTagName('html')[0].scrollTop =
          document.querySelectorAll('.fml-calc')[0].getBoundingClientRect().y +
          document.getElementsByTagName('html')[0].scrollTop - 100;
      },
      modifyProjected: function (element, value) {
        var input = element.parentElement.getElementsByTagName('input')[0],
          inputVal = parseFloat(input.value);
        input.value = Math.round(inputVal * ((100+value)/100));
      }
    },
    helpers: {
      detectPath: function () {
        if (fml.helpers.path[document.location.hostname]) {
          fml.data = !!document.location.href.match(/\#data=/) ?
            JSON.parse(decodeURIComponent(document.location.href.replace(/.*?#data=/, ''))) :
            {};
          fml.helpers.path[document.location.hostname]();
        } else {
          fml.handlers.prompt();
        }
      },
      path: {
        'fantasymovieleague.com': function () {
          fml.formdata = fml.helpers.parseFMLData(fml.helpers.flattenData(fml.data));
          fml.handlers.setupDom();
          fml.handlers.recalculate();
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
            fml.data.bop = {};
            for (var key in rows) {
              var row = rows[key];
              fml.data.bop[row.getElementsByTagName('td')[nameCol].innerHTML.replace(/\W/g, '').toLowerCase()] =
                parseFloat(row.getElementsByTagName('td')[projectedCol].innerHTML.replace(/\D/g, ''));
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficepro!\n\n");
          }
        },
        'www.boxofficemojo.com': function () {
          if (document.location.href.match('boxofficemojo.com/news/') && !document.location.href.match('id=')) {
            var rows = Array.from(document.querySelectorAll('ul.nav_tabs ~ table table')[0].getElementsByTagName('tr')).slice(1);
            for (var i = 0; i < rows.length; i++) {
              var dateStr = rows[i].querySelectorAll('td>font>b')[0],
                date = new Date(dateStr.innerHTML),
                today = (new Date()).setHours(0,0,0,0);
              
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

            fml.data.bom = {};
            for (var i = 0; i < movies.length; i++) {
              fml.data.bom[movies[i].innerHTML.replace(/\W/g, '').toLowerCase()] =
                parseFloat(vals[i].innerHTML.replace(/.*? - \$/, '').replace(/[^\d\.]/g, '')) * 1000000;
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficemojo!\n\n");
          }
        },
        'www.boxofficereport.com': function () {
          var dateStr = document.querySelectorAll('h5')[0].innerHTML.replace(/Published on /mi, '').replace(/ at(.|\r|\n)*/i, ''),
            date = new Date(dateStr),
            today = (new Date()).setHours(0, 0, 0, 0);
          if (today - date < fml.staleThreshold * 24 * 60 * 60 * 1000) {
            var options = Array.from(document.querySelectorAll('h4>table.inlineTable:nth-child(1) tr')).slice(1);
            fml.data.bor = {};
            for (var key in options) {
              var row = options[key],
                movie = row.getElementsByTagName('td')[1].innerHTML.replace(/\(.*?\)/g, ''),
                projected = parseFloat(row.getElementsByTagName('td')[2].innerHTML.replace(/[^\d\.]/g, '')) * 1000000;
              movie = movie.replace(/\W/g, '').toLowerCase();
              fml.data.bor[movie] = projected;
            }
            fml.handlers.prompt("\u2714 Grabbed data from boxofficereport!\n\n");
          } else {
            fml.handlers.prompt("\u274C boxofficereport hasn\'t posted yet.\n\n");
          }
        }
      },
      flattenData: function (projectedData) {
        var tempArr = {},
          returnArr = {};
        for (var source in projectedData) {
          for (var movie in projectedData[source]) {
            tempArr[movie] = tempArr[movie] ? tempArr[movie] : { sum: 0, count: 0 };
            tempArr[movie].sum = tempArr[movie].sum + projectedData[source][movie];
            tempArr[movie].count = tempArr[movie].count + 1;
          }
        }
        for (var movie in tempArr) {
          returnArr[movie] = Math.round(tempArr[movie].sum / tempArr[movie].count);
        }
        return returnArr;
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
          var code = title.replace(/\W/g, '').toLowerCase();

          var projected = projectedData[code],
            hasProjection = !!projected;
          if (!hasProjection) {
            projected = cost * 75000;
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
          fml.formdata[movie].projected += fml.formdata[movie].bestValue ? 2000000 : 0;
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
