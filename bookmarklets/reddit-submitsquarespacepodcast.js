var subreddit = prompt('Enter the subreddit to submit to', localStorage.getItem('subreddit') || '');
localStorage.setItem('subreddit', subreddit);
var baseUrl = 'https://www.reddit.com/r/' + subreddit + '/submit?';
var feedurl, title, url, items;

function getItems() {
    items = [...document.querySelectorAll('article')];
    openNext();
}

function openNext() {
    if (items.length) {
        console.log(items.length + ' remaining');

        feedurl = items[0].querySelector('a').href;
        title = items[0].querySelector('a.BlogList-item-title').innerText;

        url = baseUrl + 'url=' + encodeURIComponent(feedurl) + '&title=' + encodeURIComponent(title);
        window.open(url);

        items.shift();
        setTimeout(openNext, 500);
    } else {
        console.log('Done');
    }
}

getItems();