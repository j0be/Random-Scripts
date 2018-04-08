javascript: (function () {
  window.approvedUsers = [];
  window.approvedAfter = '';
  window.approvedI = 1;

  window.bannedUsers = [];
  window.bannedAfter = '';
  window.bannedI = 1;

  window.domStatus = function (str) {
    if (!$('#domstatus').length) {
      $('body').append('<div id="domstatus" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%;); padding: .5em; background: #fff; border: 1px solid #999;"></div>')
    }
    $('#domstatus').html(str);
  };

  window.getApprovedList = function () {
    window.domStatus('Getting Approved Page ' + window.approvedI + '. (' + window.approvedUsers.length + ' approved submitters)');
    $.ajax({
      'url': 'https://www.reddit.com/r/centuryClub/about/contributors.json',
      data: {
        count: 100,
        after: window.approvedAfter
      }
    }).then(function (data) {
      if (data.data.children.length) {
        window.approvedI++;
        window.approvedAfter = data.data.after;
        var users = data.data.children;
        for (var key in users) {
          window.approvedUsers.push(users[key].name);
        }
      }
      if (data.data.after) {
        window.getApprovedList();
      } else {
        window.getBannedList();
      }
    });
  };

  window.getBannedList = function () {
    window.domStatus('Getting Banned Page ' + window.banI + '. (' + window.bannedUsers.length + ' approved submitters)');
    $.ajax({
      'url': 'https://www.reddit.com/r/centuryClub/about/banned.json',
      data: {
        count: 100,
        after: window.bannedAfter
      }
    }).then(function (data) {
      if (data.data.children.length) {
        window.banI++;
        window.bannedAfter = data.data.after;
        var users = data.data.children;
        for (var key in users) {
          window.bannedUsers.push(users[key].name);
        }
      }
      if (data.data.after) {
        window.getBannedList();
      } else {
        window.mergeLists();
      }
    });
  };

  window.mergeLists = function () {
    var str = 'Banned users in approved list:<br/>';
    for (var key in bannedUsers) {
      if (approvedUsers.indexOf(bannedUsers[key]) !== -1) {
        str += bannedUsers[key] + '<br/>';
      }
    }
    window.domStatus(str);
  }

  getApprovedList();
})();
