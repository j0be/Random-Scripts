javascript: (function() { if (!document.location.href.match('9xbuddy')) { if (document.location.href.match('youtu') || document.location.href.match('vimeo.com') || document.location.href.match('vine.co') || document.location.href.match('facebook.co') || document.location.href.match('instagram.com')) { document.location = 'http://9xbuddy.com/download?url=' + document.location.href; } else if (document.location.href.match('tumblr') || document.getElementsByClassName('tumblr_video_container').length > 0 || document.getElementsByClassName('vine-embed').length > 0) { if (document.getElementsByClassName('inline_embed').length > 0) { if (v = document.getElementsByClassName('inline_embed')[0].innerHTML.match(/video_file.*?mp4/)) { v = v[0].replace(/video_file\/\d+\//, '').replace(/\\.*/, ''); document.location = 'http://vt.tumblr.com/' + v + '.mp4'; } else { alert('No video found e.1'); } } else if (document.getElementsByClassName('media').length > 0) { v = document.getElementsByClassName('media'); v = v[0].children[0]; document.location = v.getAttribute("src"); } else if (document.getElementsByClassName('vine-embed').length > 0) { v = document.getElementsByClassName('vine-embed')[0]; document.location = v.getAttribute("src").replace('/embed/simple', ''); } else { alert('No video found e.2'); } } else { alert('No video found e.3'); } } else { alert('Run on a video page'); }})();