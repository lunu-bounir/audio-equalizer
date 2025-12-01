let port;
try {
  port = document.getElementById('iea-port');
  port.remove();
}
catch (e) {
  port = document.createElement('span');
  port.id = 'iea-port';
  document.documentElement.append(port);
}

const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

port.addEventListener('connected', () => chrome.runtime.sendMessage({
  method: 'connected'
}));
port.addEventListener('disconnected', () => chrome.runtime.sendMessage({
  method: 'disconnected'
}));
port.addEventListener('can-attach', () => port.dataset.enabled === 'true' && chrome.runtime.sendMessage({
  method: 'can-attach',
  message: ''
}));
port.addEventListener('cannot-attach', () => port.dataset.enabled === 'true' && chrome.runtime.sendMessage({
  method: 'cannot-attach',
  message: 'audio source is cross-origin and equalization is not possible'
}));

let name = '';
chrome.storage.local.get({
  'levels': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'volume': 1,
  'pan': 0,
  'mono': false,
  'enabled': false,
  'profile': 'Default'
}, prefs => {
  port.dataset.profile = prefs.profile;
  bands.forEach((band, i) => port.dataset[band] = prefs.levels[i]);
  port.dataset.pan = prefs.pan;
  port.dataset.preamp = prefs.volume;
  port.dataset.mono = prefs.mono;
  port.dataset.enabled = prefs.enabled;
  port.dataset.exceptions = JSON.stringify(prefs['exception-list']);
});
chrome.storage.onChanged.addListener(ps => {
  if (ps.levels && name === '') {
    bands.forEach((band, i) => port.dataset[band] = ps.levels.newValue[i]);
    port.dispatchEvent(new Event('levels-changed'));
  }
  if (ps['levels.' + name]) {
    bands.forEach((band, i) => port.dataset[band] = ps['levels.' + name].newValue[i]);
    port.dispatchEvent(new Event('levels-changed'));
  }
  if (ps.pan && name === '') {
    port.dataset.pan = ps.pan.newValue;
    port.dispatchEvent(new Event('pan-changed'));
  }
  if (ps['pan.' + name]) {
    port.dataset.pan = ps['pan.' + name].newValue;
    port.dispatchEvent(new Event('pan-changed'));
  }
  if (ps.mono && name === '') {
    port.dataset.mono = ps.mono.newValue;
    port.dispatchEvent(new Event('mono-changed'));
  }
  if (ps['mono.' + name]) {
    port.dataset.mono = ps['mono.' + name].newValue;
    port.dispatchEvent(new Event('mono-changed'));
  }

  if (ps.volume) {
    port.dataset.preamp = ps.volume.newValue;
    port.dispatchEvent(new Event('preamp-changed'));
  }
  if (ps.enabled) {
    port.dataset.enabled = ps.enabled.newValue;
    port.dispatchEvent(new Event('enabled-changed'));
  }
});

// update prefs for this hostname
self.start = () => chrome.runtime.sendMessage({
  method: 'me'
}, href => {
  if (href && href.startsWith('http')) {
    chrome.storage.local.get({
      profiles: ['Default'],
      profile: 'Default'
    }, prefs => {
      const {hostname, pathname} = new URL(href);

      const n = ['@ ', ...prefs.profiles].filter(p => p.includes('@')).sort((a, b) => {
        const [ha, pa] = (a.split('@')[1] || '').split('/');
        const [hb, pb] = (b.split('@')[1] || '').split('/');

        if (ha === hostname && hb === hostname) {
          if (pb && pathname.startsWith('/' + pb)) {
            return 1;
          }
          if (pa && pathname.startsWith('/' + pa)) {
            return -1;
          }

          return 0;
        }
        if (ha === hostname) {
          return -1;
        }
        if (hb === hostname) {
          return 1;
        }
        if (hostname.endsWith(hb)) {
          return 1;
        }
        if (hostname.endsWith(ha)) {
          return -1;
        }
      }).shift();
      if (n !== '@ ') {
        name = n;

        if (port.dataset.profile !== n) {
          if (n.includes('.disabled')) {
            port.dataset.enabled = false;
            chrome.runtime.sendMessage({
              method: 'disabled'
            });

            return;
          }

          chrome.storage.local.get({
            ['levels.' + n]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ['volume.' + n]: 1,
            ['pan.' + n]: 0,
            ['mono.' + n]: false,
            'enabled': false
          }, prefs => {
            port.dataset.enabled = prefs.enabled;

            bands.forEach((band, i) => port.dataset[band] = prefs['levels.' + name][i]);
            port.dataset.pan = prefs['pan.' + name];
            port.dataset.mono = prefs['mono.' + name];
          });
        }
      }
    });
  }
});
self.start();
