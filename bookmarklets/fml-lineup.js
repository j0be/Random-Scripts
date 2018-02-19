javascript: (function () {
  window.flattenData = function (projectedData) {
    var tempArr = {},
      returnArr = {};
    console.log(projectedData);
    for (var source in projectedData) {
      for (var movie in projectedData[source]) {
        tempArr[movie] = tempArr[movie] ? tempArr[movie] : { sum: 0, count: 0};
        tempArr[movie].sum = tempArr[movie].sum + projectedData[source][movie];
        tempArr[movie].count =tempArr[movie].count + 1;
      }
    }
    for (var movie in tempArr) {
      returnArr[movie] = tempArr[movie].sum / tempArr[movie].count;
    }
    console.log(returnArr);
    return returnArr;
  };
  window.setupData = function (projectedData) {
    projectedData = flattenData(projectedData);
    var weekendWeight = {
      '3': {
        'FRI': .4184,
        'SAT': .3309,
        'SUN': .2507
      },
      '4': {
        'FRI': .311,
        'SAT': .2793,
        'SUN': .2798,
        'MON': .1298
      }
    };
    var movies = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .outer-wrap'),
      titles = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .title'),
      bux = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .cost-wrap');
    var fmlData = [];
    var numdays = eval(document.querySelectorAll(".cineplex__bd-week_details .cineplex-details-name-value.first strong")[0].innerHTML.replace(/[a-z]/gi, '')) * -1 + 1;
    for (var i = 0; i < movies.length; i++) {
      var title = titles[i].innerHTML.trim();
      var day = title.match(/ONLY$/) ?
        title.substring(0, 3) :
        '';
      var cost = parseFloat(bux[i].childNodes[bux[i].childNodes.length - 1].nodeValue);;
      if (day) {
        title = title.replace(/^\w{3} - /, '').replace(/ - \w{3} ONLY$/, '');
      }

      var projected = projectedData[title.replace(/\W/g, '').toLowerCase()];
      if (!projected) {
        projected = cost * 10000;
        movies[i].setAttribute('style', 'border: 1px solid #f00');
      }

      if (day) {
        projected = Math.round(projected * weekendWeight[numdays][day]);
      }

      fmlData.push({
        'title': title,
        'day': day,
        'projected': projected,
        'bux': cost
      });
    }

    return fmlData;
  };
  window.getBestLineup = function (fmlData) {
    window.bestLineup = [];
    window.maxWinning = 0;
    window.variations = 0;
    getVariation(fmlData, [], 1000);

    var str = '';
    for (var i = 0; i < bestLineup.length; i++) {
      str += bestLineup[i].title + ' ' + bestLineup[i].day + ' | ' + Number(bestLineup[i].projected).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      }) + '\n';
    }
    str += '\nProjected: ' + Number(maxWinning).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    return str;
  };
  window.getVariation = function (fml, passedLineup, bux) {
    window.variations++;
    var penalty = {
      'title': 'Empty',
      'projected': -2000000,
      'day': '',
      'bux': 0
    };
    if (passedLineup.length < 8) {
      for (var m = 0; m < fml.length; m++) {
        var lineup = passedLineup.slice();
        var movie = fml[m],
          prevBux = lineup.length ? lineup[lineup.length - 1].bux : 1000,
          tooExpensive = bux - movie.bux < 0,
          cheaperThanPrevious = movie.bux <= prevBux;

        if (!tooExpensive && cheaperThanPrevious && lineup.length < 8) {
          lineup.push(movie);
          getVariation(fml, lineup, bux - movie.bux);
        } else {
          for (var i = lineup.length; i < 8; i++) {
            lineup.push(penalty);
          }
          getVariation(fml, lineup, bux);
        }
      }
    } else {
      var lineupVal = getValue(passedLineup);
      if (lineupVal > window.maxWinning) {
        window.maxWinning = lineupVal;
        window.bestLineup = passedLineup.slice();
      }
    }
  };
  window.getValue = function (vlineup) {
    var value = 0;
    for (var i = 0; i < vlineup.length; i++) {
      value += vlineup[i]['projected'];
    }
    return value;
  };

  if (document.location.host != 'www.boxofficemojo.com' &&
      document.location.host != 'pro.boxoffice.com' &&
      document.location.host != 'fantasymovieleague.com') {
    document.location.href = 'http://www.boxofficemojo.com/news/';
  } else if (document.location.href =='http://www.boxofficemojo.com/news/') {
    var rows = Array.from(document.querySelectorAll('ul.nav_tabs ~ table table')[0].getElementsByTagName('tr')).slice(1);
    for (var i=0; i<rows.length; i++) {
      var dateStr = rows[i].querySelectorAll('td>font>b')[0],
        date = new Date(dateStr.innerHTML);
      console.log(date.getDay());
      if (date.getDay() == 4) {
        document.location.href = rows[i].getElementsByTagName('a')[0].getAttribute('href');
        break;
      }
    }
  } else if (document.location.href.match('boxofficemojo.com/news/')) {
    var forecasts = document.querySelectorAll('h1 ~ ul'),
      movies = forecasts[forecasts.length - 1].getElementsByTagName('b'),
      vals = forecasts[forecasts.length - 1].getElementsByTagName('li');

    projectedArr = {
      'bom': {}
    };
    for (var i=0; i<movies.length; i++) {
      projectedArr.bom[movies[i].innerHTML.replace(/\W/g, '').toLowerCase()] =
        parseFloat(vals[i].innerHTML.replace(/.*? - \$/, '').replace(/[^\d\.]/g, '')) * 1000000;
    }
    document.location.href = 'http://pro.boxoffice.com/category/boxoffice-forecasts/?data=' + JSON.stringify(projectedArr);
  } else if (document.location.host != 'pro.boxoffice.com' &&
      document.location.host != 'fantasymovieleague.com') {
    document.location.href = 'http://pro.boxoffice.com/category/boxoffice-forecasts/';
  } else if (document.location.host == 'pro.boxoffice.com' && document.getElementsByTagName('body')[0].className.match('category')) {
    var links = document.getElementsByTagName('h3');
    for (var i=0; i<links.length; i++) {
      console.log(links[i].getElementsByTagName('a')[0].innerHTML);
      if (links[i].getElementsByTagName('a')[0].innerHTML.match('Weekend')) {
        document.location.href = links[i].getElementsByTagName('a')[0].getAttribute('href') + document.location.search;
        break;
      }
    }
  } else if (document.location.host == 'pro.boxoffice.com' && document.getElementsByTagName('body')[0].className.match('single')) {
    var post = document.getElementsByClassName('post-container')[0],
      rows = Array.from(post.getElementsByTagName('tbody')[0].getElementsByTagName('tr')).slice(1),
      nameCol = 0,
      projectedCol = 2,
      projectedArr = document.location.href.match('data=') ?
        JSON.parse(decodeURIComponent(document.location.search.replace("?data=", ''))) :
        {};
      projectedArr['bop'] = {};
    for (var key in rows) {
      var row = rows[key];
      projectedArr.bop[row.getElementsByTagName('td')[nameCol].innerHTML.replace(/\W/g, '').toLowerCase()] =
        parseFloat(row.getElementsByTagName('td')[projectedCol].innerHTML.replace(/\D/g, ''));
    }
    document.location.href = 'http://fantasymovieleague.com/?data=' + JSON.stringify(projectedArr);
  } else if (document.location.host == 'fantasymovieleague.com' && !!document.location.href.match('data=')) {
    var projectedData = JSON.parse(decodeURIComponent(document.location.search.replace("?data=", '')));
    fmlData = setupData(projectedData);
    output = getBestLineup(fmlData);
    alert(output);
  } else {
    alert('This shouldn\'t have happened');
  };
})();
