var subreddit = prompt('Enter the subreddit to submit to', localStorage.getItem('subreddit') || '');
var prefix = prompt('Enter a title prefix (can be empty)', localStorage.getItem('prefix') || '');
prefix = !!prefix ? prefix.trim() + ' ' : '';

localStorage.setItem('subreddit', subreddit);
localStorage.setItem('prefix', prefix);
var baseUrl = 'https://www.reddit.com/r/' + subreddit + '/submit?';
var feedurl, title, titleEl, url, indexDiff, items, item;
var i = 0;
var source;

var getItems = function() {
    var xml;

    xml = xml || (document.querySelector('pre') || {}).innerText;
    xml = xml || (document.querySelector('rss') || {}).innerHTML;
    xml = xml || (document.querySelector('#bodyblock') || {}).innerHTML;
    xml = xml || (document.querySelector('.container,.episode-listing')|| {}).innerHTML;

    var el = document.createElement('div');
    el.innerHTML = xml;
    items = [...el.querySelectorAll('item,.item,.one-ep')];
    items = items.length && items || [...el.querySelectorAll('#currentFeedContent ~ ul')];

    openNext();
}

var openNext = function() {
    console.log(`${items.length} remaining`);
    var desc;

    if (items.length) {
        if (items.length % 10 === 0) {
            alert('Continue?');
        }

        item = items[items.length - 1];

        link = item.innerHTML.match(/<link.*?>(.*?)(\n|\r|<\/link>|$)/i); // Because malformed rss
        if (link) {
            feedurl = link && link[1].replace('<!--[CDATA[', '').replace(/]]-->/,'') || '';
            titleEl = item.querySelectorAll('title')[0];
            title = (titleEl.innerText || titleEl.innerHTML).replace(/<!\[CDATA\[/i, '').replace(/\]\]>/, '');
        } else if (item.querySelector('.episode-title')) {
            feedurl = item.querySelector('.episode-link,.episode-title>a') && item.querySelector('.episode-link,.episode-title>a').getAttribute('href');
            desc = item.querySelector('.episode-description,.episode-summary') && item.querySelector('.episode-description,.episode-summary').innerText.trim().replace(/[\r\n]+/g, "\r\n\r\n");
            title = item.querySelector('.episode-title').innerText;
        } else {
            feedurl = item.querySelector('a').getAttribute('href');
            title = item.querySelector('a').innerText;
        }

        if (!desc && document.location.href.match('self')) {
            desc = item.innerHTML.match(/<description.*?>(.*?)(\n|\r|<\/description>|$)/i)[1]; // Because malformed rss
        }

        if (title) {
            if (feedurl && !document.location.href.match('self')) {
                url = `${baseUrl}url=${encodeURIComponent(feedurl)}&title=${encodeURIComponent(prefix)}${encodeURIComponent(title)}`;
            } else {
                url = `${baseUrl}selftext=true&text=${encodeURIComponent(desc)}&title=${encodeURIComponent(prefix)}${encodeURIComponent(title)}`;
            }

            window.open(url);
        } else {
            console.error(`Couldn't get the title or feed url for: ${title} - ${feedurl}`);
        }

        i++;
        items.pop();
        setTimeout(openNext, 100);
    } else {
        console.log('Done');
    }
}

getItems();