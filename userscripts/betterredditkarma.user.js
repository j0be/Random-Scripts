// ==UserScript==
// @name        Better Reddit Karma
// @namespace   j0be
// @description on any reddit user page, it will include the combined karma as well
// @include     http://*reddit.com/user/*
// @include     https://*reddit.com/user/*
// @version     1.1.4
// @grant       none
// ==/UserScript==

$(document).ready(function() {
  var k = [],p,c;
  $('.titlebox .karma:eq(0),.titlebox .karma:eq(1)').each(function(i) {
      k[i] = $(this).text();
      $(this).hide();
  });
  var s = $('.titlebox').first().html().replace(/(link|comment|post) karma/g,'');
  $('.titlebox').first().html(s);
  $('.titlebox h1').first().after('<span style="text-align: right;"> <table> <tr><td style="text-align:right"><span class="karma">'+k[0]+'</span></td><td style="text-align:left; padding-left:.5em;"> post karma</td></tr> <tr><td style="text-align:right"><span class="karma comment-karma">'+k[1]+'</span></td><td style="text-align:left; padding-left:.5em;"> comment karma</td></tr> <tr style="border-top: 1px dashed #888;"><td style="text-align:right"><span class="karma comment-karma">'+(parseFloat(k[0].replace(/,/g,''))+parseFloat(k[1].replace(/,/g,''))).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+'</span></td><td style="text-align:left; padding-left:.5em;"> combined karma</span></td></tr> </table> </span>');
  
  if ($('#per-sr-karma').length > 0) {
    $('#per-sr-karma').before('<style>.percentbar {position: absolute; left: 0; height: 1.2em; width: 100%; top: initial; margin-top: -1.2em;} #per-sr-karma {font-size: .8em;} #per-sr-karma #sr-karma-header {width:auto} #piechart {width:100%; height:260px; display: none;}</style><div id="piechart"></div><script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>');
    $('#per-sr-karma thead tr').append('<th>combined</th>');
    $('#per-sr-karma tbody tr').append('<td>');

    var combinedTotal = parseFloat($('.titlebox table').first().find('tr').last().find('td').first().text().replace(/,/g,''));
    $('#per-sr-karma tbody th').each(function() {
      p = parseFloat($(this).siblings().first().text());
      c = parseFloat($(this).siblings().first().next().text());
      $(this).siblings().last().text(p+c);
      $(this).attr('title',$(this).text() + ' (' + ((Math.round(10000*((p+c)/combinedTotal)))/100) + '%)');
      $(this).append('<div class="percentbar" style="background: linear-gradient(90deg, rgba(0, 64, 255, 0.06), rgba(0, 64, 255, 0.06) '+(Math.round((p/(p+c))*100))+'%, rgba(255, 201, 0, 0.06) '+(Math.round((p/(p+c))*100))+'%, rgba(255, 201, 0, 0.06) 100%)">');
    });

    window.drawChart = function () {
      var myData = [
        ['Subreddit', 'Combined Karma'],
      ];
      $('#per-sr-karma tbody tr').each(function() {
        myData.push([
          $(this).children().first().text(),
          Math.max(0,parseFloat($(this).children().last().text()))
        ]);
      });
      var options = {
        sliceVisibilityThreshold: 0.005,
        backgroundColor: 'transparent',
        chartArea: {left:'12.5%',top:'12.5%',width:'75%',height:'75%'},
        legend: {position: 'none'}
      };
      var data = window.google.visualization.arrayToDataTable(myData);
      var chart = new window.google.visualization.PieChart(document.getElementById('piechart'));
      chart.draw(data, options);
    };

    $('.karma-breakdown a').click(function() {
      $('#piechart').show();
      window.t = setInterval(function () {
        if (window.google) {
          clearInterval(window.t);
          window.google.charts.load('current', {'packages':['corechart']});
          window.google.charts.setOnLoadCallback(window.drawChart);
          delete window.t;
        }
      },1000);
    });
  }
});