javascript: (function() {
  window.setupData = function (projectedData) {
    var weekendWeight = {
      'FRI': .38,
      'SAT': .34,
      'SUN': .21,
      'MON': .07
    };
    var movies = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .outer-wrap'),
      titles = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .title'),
      bux = document.querySelectorAll('ul.cineplex__bd-movies .cineplex__bd-movie-item .cost-wrap');
    var fmlData = [];
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
        projected = Math.round(projected * weekendWeight[day]);
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
  window.getBestLineup = function(fmlData) {
    window.bestLineup = [];
    window.maxWinning = 0;
    window.variations = 0;
    getVariation(fmlData, [], 1000);

    var str = '';
    for (var i=0; i<bestLineup.length; i++) {
      str += bestLineup[i].title + ' ' + bestLineup[i].day + ' | ' + Number(bestLineup[i].projected).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) + '\n';
    }
    str += '\nProjected: '+ Number(maxWinning).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return str;
  };

  window.getVariation = function(fml, passedLineup, bux) {
    window.variations ++;
    var penalty = {'title': 'Empty', 'projected': -2000000, 'day': '', 'bux': 0};
    if (passedLineup.length < 8) {
      for (var m=0; m<fml.length; m++) {
        var lineup = passedLineup.slice();
        var movie = fml[m],
          prevBux = lineup.length ? lineup[lineup.length - 1].bux : 1000,
          tooExpensive = bux - movie.bux < 0,
          cheaperThanPrevious = movie.bux <= prevBux;
        
        if (!tooExpensive && cheaperThanPrevious && lineup.length < 8) {
          lineup.push(movie);
          getVariation(fml, lineup, bux - movie.bux);
        } else {
          for (var i=lineup.length; i<8; i++) {
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

  if (document.location.host != 'pro.boxoffice.com' && !document.location.href.match('data=')) {
    document.location.href = 'http://pro.boxoffice.com/category/boxoffice-forecasts/';
  } else if (document.getElementsByTagName('body')[0].className.match('category')) {
    document.location.href = document.getElementsByTagName('h3')[0].getElementsByTagName('a')[0].getAttribute('href');
  } else if (document.getElementsByTagName('body')[0].className.match('single')) {
    var post = document.getElementsByClassName('post-container')[0],
      rows = Array.from(post.getElementsByTagName('tbody')[0].getElementsByTagName('tr')).slice(1),
      nameCol = 0,
      projectedCol = 2,
      projectedArr = {};
    for (var key in rows) {
      var row = rows[key];
      projectedArr[row.getElementsByTagName('td')[nameCol].innerHTML.replace(/\W/g, '').toLowerCase()] = parseFloat(row.getElementsByTagName('td')[projectedCol].innerHTML.replace(/\D/g, ''));
    }
    document.location.href = 'http://fantasymovieleague.com/?data='+JSON.stringify(projectedArr);
  } else if (document.location.host == 'fantasymovieleague.com' && document.location.href.match('data=')) {
    var projectedData = JSON.parse(decodeURIComponent(document.location.search.replace("?data=", '')));
    fmlData = setupData(projectedData);
    output = getBestLineup(fmlData);
    alert(output);
  } else {
    alert('This shouldn\'t have happened');
  };
})();
