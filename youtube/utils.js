'use strict';

var utils = {};

utils.filter = d => {
  if (d.url) {
    if (d.url.startsWith('https://www.youtube.com') || d.url.startsWith('https://music.youtube.com')) {
      return true;
    }
  }
  return false;
};

utils.msg = {
  reload: 'Please reload your YouTube tabs'
};
