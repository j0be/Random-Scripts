javascript: (function() {    mytitle = $('#siteTable a.title').text().replace(/ /g,'+');    sub = $('.redditname a').first().text();    document.location = 'http://www.reddit.com/r/'+sub+'/search?q=title%3A%28'+mytitle+'%29&restrict_sr=on&sort=top&t=all'})();