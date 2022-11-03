/* global range, Notify */
'use strict';

let tab;

const utils = {};
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

const elements = {
  mono: document.getElementById('mono'),
  pan: document.getElementById('pan'),
  volume: document.getElementById('volume'),
  levels: document.getElementById('levels'),
  presets: document.getElementById('presets'),
  profiles: document.getElementById('profiles'),
  add: document.getElementById('add'),
  remove: document.getElementById('remove'),
  enabled: document.getElementById('enabled'),
  persist: document.getElementById('persist')
};

const notify = new Notify();

const [volume, ...ranges] = range.prepare();
const pan = ranges.pop();

const presets = {
  'Classical': [0.375, 0.375, 0.375, 0.375, 0.375, 0.375, -4.5, -4.5, -4.5, -6],
  'Club': [0.375, 0.375, 2.25, 3.75, 3.75, 3.75, 2.25, 0.375, 0.375, 0.375],
  'Custom': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Default': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Live': [-3, 0.375, 2.625, 3.375, 3.75, 3.75, 2.625, 1.875, 1.875, 1.5],
  'Laptop Speakers/Headphone': [3, 6.75, 3.375, -2.25, -1.5, 1.125, 3, 6, 7.875, 9],
  'Rock': [4.875, 3, -3.375, -4.875, -2.25, 2.625, 5.625, 6.75, 6.75, 6.75],
  'Pop': [-1.125, 3, 4.5, 4.875, 3.375, -0.75, -1.5, -1.5, -1.125, -1.125],
  'Full Bass and Treble': [4.5, 3.75, 0.375, -4.5, -3, 1.125, 5.25, 6.75, 7.5, 7.5],
  'Full Bass': [6, 6, 6, 3.75, 1.125, -2.625, -5.25, -6.375, -6.75, -6.75],
  'Full Treble': [-6, -6, -6, -2.625, 1.875, 6.75, 9.75, 9.75, 9.75, 10.5],
  'Soft': [3, 1.125, -0.75, -1.5, -0.75, 2.625, 5.25, 6, 6.75, 7.5],
  'Party': [4.5, 4.5, 0.375, 0.375, 0.375, 0.375, 0.375, 0.375, 4.5, 4.5],
  'Ska': [-1.5, -3, -2.625, -0.375, 2.625, 3.75, 5.625, 6, 6.75, 6],
  'Soft Rock': [2.625, 2.625, 1.5, -0.375, -2.625, -3.375, -2.25, -0.375, 1.875, 5.625],
  'Large Hall': [6.375, 6.375, 3.75, 3.75, 0.375, -3, -3, -3, 0.375, 0.375],
  'Reggae': [0.375, 0.375, -0.375, -3.75, 0.375, 4.125, 4.125, 0.375, 0.375, 0.375],
  'Techno': [4.875, 3.75, 0.375, -3.375, -3, 0.375, 4.875, 6, 6, 5.625]
};

const prefs = {
  enabled: false,
  persist: false,
  profiles: ['Default'],
  profile: 'Default',
  pan: 0,
  mono: false
};

const save = {
  custom(name, value) {
    const prefs = {
      [name + '.' + elements.profiles.value]: value
    };
    // per hostname (do not alter globally)
    if (elements.profiles.value.includes('@') === false) {
      prefs[name] = value;
    }
    save.prefs(prefs);
  },
  prefs: prefs => new Promise(resolve => chrome.storage.local.set(prefs, resolve)),
  mono: () => save.custom('mono', elements.mono.checked),
  pan: () => save.custom('pan', 1 - (100 - pan.value) / 50),
  levels: () => save.custom('levels', presets[elements.presets.value]),
  volume: () => save.prefs({
    'volume': (100 - volume.value) / 50
  }),
  presets: () => save.prefs({
    ['presets.' + elements.profiles.value]: elements.presets.value
  }),
  profiles: () => {
    const ps = {
      profiles: prefs.profiles,
      volume: (100 - volume.value) / 50
    };
    if (prefs.profile.includes('@') === false) {
      ps.profile = prefs.profile;
      ps.levels = presets[elements.presets.value];
    }
    save.prefs(ps);
  },
  enabled: () => save.prefs({
    enabled: elements.enabled.checked
  }),
  persist: () => save.prefs({
    persist: elements.persist.checked
  })
};

const update = {
  levels: () => presets[elements.presets.value]
    .map(v => (-v + 20) / 40 * 100)
    .forEach((value, i) => ranges[i].value = value),
  volume: level => volume.value = (2 - level) * 50,
  ui: (callback = () => {}) => chrome.storage.local.get({
    ['mono.' + elements.profiles.value]: false,
    ['pan.' + elements.profiles.value]: 0,
    ['volume.' + elements.profiles.value]: 1,
    ['levels.' + elements.profiles.value]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['presets.' + elements.profiles.value]: 'Default'
  }, prefs => {
    // presets
    elements.presets.value = prefs['presets.' + elements.profiles.value];

    pan.value = 100 - (1 - prefs['pan.' + elements.profiles.value]) * 50;

    elements.mono.checked = prefs['mono.' + elements.profiles.value];
    //
    presets[elements.presets.value] = prefs['levels.' + elements.profiles.value];
    update.levels();
    update.volume(prefs['volume.' + elements.profiles.value]);
    callback();
  })
};

// presets
Object.keys(presets).forEach(key => {
  const option = document.createElement('option');
  option.value = key;
  option.textContent = key;
  elements.presets.appendChild(option);
});
elements.presets.addEventListener('change', async () => {
  update.levels();
  await save.presets();
  await save.levels();
});

// volume
elements.volume.addEventListener('change', save.volume);
// pan
elements.pan.addEventListener('change', save.pan);
// mono
elements.mono.addEventListener('change', save.mono);

// levels
{
  let id;
  const act = async () => {
    elements.presets.value = 'Custom';
    presets.Custom = ranges.map(r => -1 * r.value / 100 * 40 + 20);
    await save.presets();
    await save.levels();
  };
  elements.levels.addEventListener('change', () => {
    clearTimeout(id);
    id = setTimeout(act, 100);
  });
}

// add
elements.add.addEventListener('click', async () => {
  let msg = 'New profile name (must be unique)';
  if (tab.url && tab.url.startsWith('http')) {
    try {
      const {hostname} = new URL(tab.url);

      msg += `\n\nTo limit the profile to this hostname, append "@${hostname}" to the profile name.`;
    }
    catch (e) {}
  }


  const name = window.prompt(msg).trim();
  if (name) {
    if (prefs.profiles.some(a => a === name)) {
      alert('Profile name already exists!');
    }
    else {
      prefs.profiles.push(name);
      prefs.profiles = prefs.profiles.sort();
      prefs.profile = name;

      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      elements.profiles.appendChild(option);
      elements.profiles.value = name;

      await save.profiles();
      await save.presets();
      await save.volume();
      await save.levels();


      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
          allFrames: true
        },
        func: () => {
          try {
            self.start();
          }
          catch (e) {}
        }
      });
    }
  }
});

// remove
elements.remove.addEventListener('click', () => {
  prefs.profiles = prefs.profiles.filter(a => a !== elements.profiles.value);
  elements.profiles.selectedOptions[0].remove();
  elements.profiles.dispatchEvent(new Event('change'));
});

// profiles
elements.profiles.addEventListener('change', () => {
  prefs.profile = elements.profiles.value;
  update.ui(save.profiles);
  elements.remove.disabled = elements.profiles.value === 'Default';
});

// enabled
elements.enabled.addEventListener('change', async () => {
  await save.enabled();
  if (elements.enabled.checked) {
    if (utils.filter(tab)) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: () => 'typeof prefs'
      }, arr => {
        if (!arr || arr[0].result === 'undefined') {
          notify.display(utils.msg.reload, 'warning', 2000);
        }
      });
    }
  }
});
elements.persist.addEventListener('change', save.persist);

// reset
document.getElementById('reset').addEventListener('click', () => {
  pan.value = 50;
  save.pan();
  volume.value = 50;
  save.volume();
});

// init
chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  tab = tabs.shift();

  chrome.storage.local.get(prefs, ps => {
    Object.assign(prefs, ps);

    if (tab.url && tab.url.startsWith('http')) {
      const {hostname} = new URL(tab.url);

      const name = ['@ ', ...prefs.profiles].filter(p => p.includes('@')).sort((a, b) => {
        const ha = a.split('@')[1];
        const hb = b.split('@')[1];

        if (ha === hostname && hb === hostname) {
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
      if (name !== '@ ') {
        prefs.profile = name;
      }
    }

    //
    elements.enabled.checked = prefs.enabled;
    elements.persist.checked = prefs.persist;
    // profiles
    prefs.profiles.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      elements.profiles.appendChild(option);
    });
    elements.profiles.value = prefs.profile;
    elements.remove.disabled = elements.profiles.value === 'Default';
    //
    update.ui();
  });
});
