javascript: (function () {
  window.subreddit = $('.pagename.redditname').text();
  window.auditApp = {
    i: 1,
    after: '',
    urls: {
      approved: '/r/' + subreddit + '/about/contributors.json',
      banned: '/r/' + subreddit + '/about/banned.json',
    },
    taskList: ['approved', 'banned', 'merge'],
    users: { approved: [], banned: []},
    task: {
      init: function(task) {
        if (task == 'approved' || task == 'banned') {
          auditApp.task.list(task);
        } else {
          auditApp.task.merge();
        }
      },
      domstatus: function (str) {
        if (!$('#domstatus').length) {
          $('body').append('<div id="domstatus" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: .5em; background: #fff; border: 1px solid #999;"></div>')
        }
        $('#domstatus').html(str);
      },
      list: function (task) {
        auditApp.task.domstatus('Getting ' + task + ' page ' + auditApp.i + '. (' + auditApp.users[task].length + ' users)');
        $.ajax({
          'url': auditApp.urls[task],
          data: {
            count: 100,
            after: auditApp.after
          }
        }).then(function (data) {
          if (data.data.children.length) {
            auditApp.i ++;
            auditApp.after = data.data.after;
            var users = data.data.children;
            for (var key in users) {
              auditApp.users[task].push(users[key].name);
            }
          }
          if (!data.data.after) {
            auditApp.taskList.shift();
            auditApp.i = 0;
            auditApp.after = '';
          } 
          auditApp.task.init(auditApp.taskList[0]);
        });
      },
      merge: function () {
        var str = 'Banned users in approved list:<br/>';
        for (var key in auditApp.users.banned) {
          if (auditApp.users.approved.indexOf(auditApp.users.banned[key]) !== -1) {
            str += auditApp.users.banned[key] + '<br/>';
          }
        }
        auditApp.task.domstatus(str);
      }
    }
  };
  auditApp.task.init(auditApp.taskList[0]);
})();
