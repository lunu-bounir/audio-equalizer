'use strict';

var utils = {};

utils.filter = d => {
  if (d.url) {
    if (d.url.startsWith('http') || d.url.startsWith('ftp') || d.url === 'about:blank') {
      return true;
    }
  }
  return false;
};

utils.msg = {
  reload: 'Please reload tabs with active audio elements'
};
