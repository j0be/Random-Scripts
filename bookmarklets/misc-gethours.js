javascript: (function () {
  if (!document.location.href.match('google.com/maps/timeline')) {
    document.location.href = 'https://www.google.com/maps/timeline';
    return false;
  };

  if (!localStorage.getItem('hsettings')) {
    var hsettings = {};
    hsettings.companyName = prompt('Enter the company name for which to filter on:', '');
    hsettings.precision = prompt('Enter the number of minutes to be precise to:', '15');
    hsettings.method = parseFloat(hsettings.precision) !== 1 ? prompt('Enter the math method to perform on the minutes: \r\n* floor\r\n* ceil\r\n* round', 'round') : 'round';
    hsettings.includeLunch = !!confirm('Should lunch breaks be counted towards your hours worked?');
    localStorage.setItem('hsettings', JSON.stringify(hsettings));
  } else {
    var hsettings = JSON.parse(localStorage.getItem('hsettings'));
  };

  var locations = document.getElementsByClassName('place-visit-title');
  var duration = 0; /* This is in minutes */
  var startTime = false;
  var endTime = false;

  for (i = 0; i < locations.length; i++) {
    if (locations[i].textContent.match(hsettings.companyName)) {
      durationText = locations[i].closest('.timeline-item').querySelector('.duration-text').textContent;
      if (!hsettings.includeLunch) {
        duration += ((new Date(durationText.split('-')[1] + ' 12/12/2015') - new Date(durationText.split('-')[0] + ' 12/12/2015')) / (1000 * 60));
      } else {
        if (!startTime) {
          startTime = new Date(durationText.split('-')[0] + ' 12/12/2015');
        };
        endTime = new Date(durationText.split('-')[1] + ' 12/12/2015');
      };
    };
  };

  if (hsettings.includeLunch) {
    duration = (endTime - startTime) / (1000 * 60);
  };

  if (duration === 0) {
    alert('No Time Found');
    return false;
  };

  var methodfunc;
  switch (hsettings.method) {
    case 'ceil':
      methodfunc = Math.ceil;
      break;
    case 'floor':
      methodfunc = Math.floor;
      break;
    default:
      methodfunc = Math.round;
      break;
  };
  prettyTime = methodfunc(duration / hsettings.precision) * hsettings.precision; /* Perform rounding function */
  prettyTime = (prettyTime / 60).toFixed(2); /* Convert to hours */
  rawHours = Math.floor(prettyTime);
  rawMinutes = ('0' + (duration - rawHours * 60)).slice(-2);
  prompt("Time spent at " + hsettings.companyName + ": " + rawHours + ':' + rawMinutes + "\r\n" + hsettings.method + ' to the nearest ' + hsettings.precision + ' minutes', prettyTime);

})();
