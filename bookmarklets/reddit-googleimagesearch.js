javascript: (function() { q = 'site:reddit.com'; loc = document.location; baseurl = 'https://www.google.com/searchbyimage?hl=en&safe=off&site=search&image_url='; if (loc.hostname == 'imgur.com' && imgur && imgur._ && imgur._.hash && imgur._.hash.length == 7) { url = 'https://i.imgur.com/' + imgur._.hash + 'h.jpg'; } else if (loc.href.match('/comments/') && loc.href.match('reddit.com')) { url = document.getElementsByClassName('linklisting')[0].getElementsByClassName('title')[0].getElementsByClassName('title')[0].getAttribute('href'); url = url.replace('.gifv','h.jpg'); } else if (loc.href.match(/(\.jpg|\.gif|\.png|imgur)\??[^.]*?$/)) { if (loc.href.match(/imgur/)) { url = loc.href.replace(/\.(webm|gifv?|jpg|png)/, 'h.jpg'); } else if (loc.href.match(/(\.jpg|\.gifv?|\.png)/)) { url = loc.href; } else { url = prompt('What image url would you like to check?'); } } else if (loc.hostname == 'gfycat.com') { url = document.getElementsByName("twitter:image")[0].getAttribute('content'); } else { url = prompt('What image url would you like to check?'); } if (url.match('http')) { document.location = baseurl + url + '&q=' + encodeURIComponent(q); } else { alert("That wasn't a url"); } })();