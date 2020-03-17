'use strict';

const prefs = {
  levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  volume: 1,
  pan: 1,
  mono: false,
  enabled: false
};

const script = document.createElement('script');
script.addEventListener('error', e => chrome.runtime.sendMessage({
  method: 'cannot-attach',
  message: e.detail.message
}));
script.addEventListener('connected', () => chrome.runtime.sendMessage({
  method: 'connected'
}));
script.addEventListener('disconnected', () => chrome.runtime.sendMessage({
  method: 'disconnected'
}));

Object.assign(script.dataset, {
  value: JSON.stringify(prefs.levels),
  volume: prefs.volume,
  pan: prefs.pan,
  mono: prefs.mono
});
script.textContent = `{
  const script = document.currentScript;
  const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

  const adjust = (target = adjust.audio) => {
    if (!target) {
      return;
    }
    adjust.audio = target;

    const enabled = script.dataset.enabled === 'true';
    if (enabled === false && target.attached && target.state === 'connected') {
      const {filters, source, context} = target;
      source.disconnect(filters.preamp);
      source.connect(context.destination);
      target.state = 'disconnected';
      script.dispatchEvent(new Event(target.state));
      return;
    }
    if (enabled && target.attached && target.state === 'disconnected') {
      const {filters, source, context} = target;
      source.disconnect(context.destination);
      source.connect(filters.preamp);
      target.state = 'connected';
      script.dispatchEvent(new Event(target.state));
    }

    if (target.attached !== true) {
      try {
        const context = new window.AudioContext();
        const source = context.createMediaElementSource(target);
        const filters = target.filters = {};
        filters.preamp = context.createGain();
        source.connect(filters.preamp);
        filters.balance = context.createStereoPanner();
        filters.preamp.connect(filters.balance);
        bands.forEach((band, i) => {
          const filter = context.createBiquadFilter();
          filter.frequency.value = band;
          filter.type = {
            '0': 'lowshelf', // The first filter, includes all lower frequencies
            [bands.length - 1]: 'highshelf'
          }[i] || 'peaking';
          filters[band] = filter;
          if (i === 0) {
            filters.balance.connect(filter);
          }
          else {
            filters[bands[i - 1]].connect(filter);
          }
        });
        filters['16000'].connect(context.destination);
        target.state = 'connected';
        script.dispatchEvent(new Event(target.state));
        Object.assign(target, {
          attached: true,
          source,
          context
        });
      }
      catch (e) {
        console.warn('cannot attach', e);
        script.dispatchEvent(new CustomEvent('error', {
          detail: {
            message: e.message
          }
        }));
      }
    }
    {
      const {filters, context: {destination}} = target;
      const {preamp, balance} = filters;
      destination.channelCount = script.dataset.mono === 'true' ? 1 : destination.maxChannelCount;
      balance.pan.value = Number(script.dataset.pan);
      preamp.gain.value = Number(script.dataset.volume);
      JSON.parse(script.dataset.value).forEach((value, i) => {
        filters[bands[i]].gain.value = value;
      });
    }
  };

  //
  script.addEventListener('adjust', () => adjust());
  // method 1
  window.addEventListener('playing', ({target}) => adjust(target), true);
  // method 2
  const play = Audio.prototype.play;
  Audio.prototype.play = function() {
    try {
      adjust(this);
    }
    catch (e) {
      console.warn(e);
    }
    return play.apply(this, arguments);
  };
}
`;
document.documentElement.appendChild(script);
script.remove();

const update = (dispatch = true) => {
  script.dataset.value = JSON.stringify(prefs.levels);
  script.dataset.volume = prefs.volume;
  script.dataset.pan = prefs.pan;
  script.dataset.mono = prefs.mono;
  script.dataset.enabled = prefs.enabled;
  if (dispatch) {
    script.dispatchEvent(new Event('adjust'));
  }
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  update(false);
});
chrome.storage.onChanged.addListener(ps => {
  if (ps.enabled) {
    prefs.enabled = ps.enabled.newValue;
  }
  if (ps.mono) {
    prefs.mono = ps.mono.newValue;
  }
  if (ps.volume) {
    prefs.volume = ps.volume.newValue;
  }
  if (ps.pan) {
    prefs.pan = ps.pan.newValue;
  }
  if (ps.levels) {
    prefs.levels = ps.levels.newValue;
  }
  if (ps.enabled || ps.levels || ps.volume || ps.pan || ps.mono) {
    update();
  }
});
