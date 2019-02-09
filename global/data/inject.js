'use strict';

var prefs = {
  levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  volume: 1,
  enabled: false
};

var script = document.createElement('script');
script.dataset.value = JSON.stringify(prefs.levels);
script.dataset.volume = prefs.volume;
script.textContent = `{
  const script = document.currentScript;
  const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
  let audio;
  const adjust = target => {
    audio = target;
    const levels = JSON.parse(script.dataset.value);
    const volume = Number(script.dataset.volume);
    if (target.attached !== true) {
      target.filters = {};

      const context = new window.AudioContext();
      let output = context.createGain();
      output.gain.value = volume;
      target.filters.preamp = output;
      const source = context.createMediaElementSource(target);
      source.connect(output);

      bands.forEach((band, i) => {
        const filter = context.createBiquadFilter();
        filter.frequency.value = band;
        filter.gain.value = levels[i];
        filter.type = {
          '0': 'lowshelf', // The first filter, includes all lower frequencies
          [bands.length - 1]: 'highshelf'
        }[i] || 'peaking';
        target.filters[band] = filter;
      });

      bands.forEach((band, i) => {
        output.connect(target.filters[band]);
        //
        if (i === bands.length - 1) {
          target.filters[band].connect(context.destination);
        }
        output = target.filters[band];
      });
      target.attached = true;
    }
    else {
      target.filters.preamp.gain.value = volume;
      bands.forEach((band, i) => {
        target.filters[band].gain.value = levels[i];
      });
    }
  };
  script.addEventListener('adjust', () => audio && adjust(audio));

  // method 1
  window.addEventListener('playing', ({target}) => {
    adjust(target);
  }, true);
  // method 2
  const play = Audio.prototype.play;
  Audio.prototype.play = function() {
    try {
      adjust(this);
    }
    catch(e) {console.log(e)}
    return play.apply(this, arguments);
  };
}`;
document.documentElement.appendChild(script);
script.remove();

var update = () => {
  script.dataset.value = JSON.stringify(prefs.enabled ? prefs.levels : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  script.dataset.volume = prefs.enabled ? prefs.volume : 1;
  script.dispatchEvent(new Event('adjust'));
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  update();
});
chrome.storage.onChanged.addListener(ps => {
  if (ps.enabled) {
    prefs.enabled = ps.enabled.newValue;
  }
  if (ps.volume) {
    prefs.volume = ps.volume.newValue;
  }
  if (ps.levels) {
    prefs.levels = ps.levels.newValue;
  }
  if (ps.enabled || ps.levels || ps.volume) {
    update();
  }
});
