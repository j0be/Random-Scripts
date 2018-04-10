javascript: (function () {
  window.subreddit = $('.pagename.redditname').text();
  window.auditApp = {
    i: 1,
    after: '',
    urls: {
      spinoff: '/r/' + subreddit + '/about/contributors.json',
      cc: '/r/CenturyClub/about/contributors.json',
    },
    taskList: ['spinoff', 'cc', 'merge'],
    users: { spinoff: [], cc: []},
    task: {
      init: function(task) {
        if (task == 'spinoff' || task == 'cc') {
          auditApp.task.list(task);
        } else {
          auditApp.task.merge();
        }
      },
      domstatus: function (str) {
        if (!$('#domstatus').length) {
          $('body').append('<div id="domstatus" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%;); padding: .5em; background: #fff; border: 1px solid #999;"></div>')
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
        var str = 'Users in spinoff that aren\'t in CC:<br/>';
        for (var key in auditApp.users.spinoff) {
          if (auditApp.users.cc.indexOf(auditApp.users.spinoff[key]) !== -1) {
            str += auditApp.users.spinoff[key] + '<br/>';
          }
        }
        auditApp.task.domstatus(str);
      }
    }
  };
  auditApp.task.init(auditApp.taskList[0]);
})();
