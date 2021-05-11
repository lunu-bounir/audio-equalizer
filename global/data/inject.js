'use strict';

const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

const script = document.createElement('script');
script.textContent = `{
  const script = document.currentScript;

  const bands = [${bands}];
  const map = new Map();

  const {connect} = AudioNode.prototype;
  const attach = source => {
    const {context} = source;
    const filters = {
      preamp: context.createGain(),
      balance: context.createStereoPanner()
    };
    filters.preamp.gain.value = isNaN(script.dataset.preamp) ? 1 : Number(script.dataset.preamp);
    source.connect(filters.preamp);
    filters.balance.pan.value = isNaN(script.dataset.pan) ? 1 : Number(script.dataset.pan);
    filters.preamp.connect(filters.balance);
    bands.forEach((band, i) => {
      const filter = context.createBiquadFilter();
      filter.frequency.value = band;
      filter.gain.value = isNaN(script.dataset[band]) ? 1 : Number(script.dataset[band]);
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
    if (script.dataset.mono === 'true') {
      context.destination.channelCount = 1;
    }
    map.set(source, filters);

    if (script.dataset.enabled === 'false') {
      return connect.call(source, context.destination);
    }
    else {
      script.dispatchEvent(new Event('connected'));
      return connect.call(filters['16000'], context.destination);
    }

  };
  const source = target => new Promise((resolve, reject) => {
    const context = new window.AudioContext();
    setTimeout(() => {
      try {
        const source = context.createMediaElementSource(target);
        resolve(source);
      }
      catch(e) {
        reject(e);
      }
    });
  });

  const detach = () => map.forEach((filters, source) => {
    source.disconnect();
    connect.call(source, source.context.destination);
    script.dispatchEvent(new Event('disconnected'));
  });
  const reattach = () => {
    map.forEach((filters, source) => {
      source.disconnect();
      source.connect(filters.preamp);
      connect.call(filters['16000'], source.context.destination);
      script.dispatchEvent(new Event('connected'));
    });
    if (map.size) {
      script.dispatchEvent(new Event('connected'));
    }
  };
  AudioNode.prototype.connect = function(node) {
    if (node instanceof AudioDestinationNode) {
      return attach(this);
    }
    else {
      return connect.apply(this, arguments);
    }
  }

  const convert = target => {
    if (
      target.src && target.crossOrigin !== 'anonymous' &&
      target.src.startsWith('http') && target.src.startsWith(origin) === false
    ) {
      target.crossOrigin = 'anonymous';
      console.warn('cannot equalize; skipped due to cors', target.src);
      script.dispatchEvent(new Event('cannot-attach'));
    }
    else {
      source(target).then(attach).catch(e => {});
      script.dispatchEvent(new Event('can-attach'));
    }
  }

  window.addEventListener('playing', e => convert(e.target), true);
  {
    const {play} = Audio.prototype;
    Audio.prototype.play = function() {
      if (this.isConnected === false) {
        convert(this);
      }
      return play.apply(this, arguments);
    };
  }
  { // in case the element is not attached
    const {play} = HTMLMediaElement.prototype;
    HTMLMediaElement.prototype.play = function() {
      if (this.isConnected === false) {
        convert(this);
      }
      return play.apply(this, arguments);
    };
  }

  script.addEventListener('levels-changed', () => map.forEach(filters => {
    bands.forEach((band, i) => {
      filters[band].gain.value = Number(script.dataset[band]);
    });
  }));
  script.addEventListener('pan-changed', () => map.forEach(filters => {
    filters.balance.pan.value = Number(script.dataset.pan);
  }));
  script.addEventListener('preamp-changed', () => map.forEach(filters => {
    filters.preamp.gain.value = Number(script.dataset.preamp);
  }));
  script.addEventListener('mono-changed', () => map.forEach(filters => {
    const {destination} = filters.preamp.context;
    destination.channelCount = script.dataset.mono === 'true' ? 1 : destination.maxChannelCount;
  }));
  script.addEventListener('enabled-changed', () => {
    if (script.dataset.enabled === 'false') {
      detach();
    }
    else {
      reattach();
    }
  });
}`;

document.documentElement.appendChild(script);
script.addEventListener('connected', () => chrome.runtime.sendMessage({method: 'connected'}));
script.addEventListener('disconnected', () => chrome.runtime.sendMessage({method: 'disconnected'}));
script.addEventListener('can-attach', () => script.dataset.enabled === 'true' && chrome.runtime.sendMessage({
  method: 'can-attach',
  message: ''
}));
script.addEventListener('cannot-attach', () => script.dataset.enabled === 'true' && chrome.runtime.sendMessage({
  method: 'cannot-attach',
  message: 'audio source is cross-origin and equalization is not possible'
}));
script.remove();

chrome.storage.local.get({
  levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  volume: 1,
  pan: 0,
  mono: false,
  enabled: false
}, prefs => {
  bands.forEach((band, i) => script.dataset[band] = prefs.levels[i]);
  script.dataset.pan = prefs.pan;
  script.dataset.preamp = prefs.volume;
  script.dataset.mono = prefs.mono;
  script.dataset.enabled = prefs.enabled;
});
chrome.storage.onChanged.addListener(ps => {
  if (ps.levels) {
    bands.forEach((band, i) => script.dataset[band] = ps.levels.newValue[i]);
    script.dispatchEvent(new Event('levels-changed'));
  }
  if (ps.pan) {
    script.dataset.pan = ps.pan.newValue;
    script.dispatchEvent(new Event('pan-changed'));
  }
  if (ps.volume) {
    script.dataset.preamp = ps.volume.newValue;
    script.dispatchEvent(new Event('preamp-changed'));
  }
  if (ps.mono) {
    script.dataset.mono = ps.mono.newValue;
    script.dispatchEvent(new Event('mono-changed'));
  }
  if (ps.enabled) {
    script.dataset.enabled = ps.enabled.newValue;
    script.dispatchEvent(new Event('enabled-changed'));
  }
});
