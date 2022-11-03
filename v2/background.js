'use strict';

const prefs = {
  enabled: false,
  persist: false
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  if (prefs.persist === false && prefs.enabled) {
    const onStartup = () => {
      prefs.enabled = false;
      chrome.storage.local.set({
        enabled: false
      });
    };
    chrome.runtime.onStartup.addListener(onStartup);
    chrome.runtime.onInstalled.addListener(onStartup);
  }
});

chrome.runtime.onMessage.addListener((request, sender) => {
  const tabId = sender.tab.id;
  if (request.method === 'cannot-attach' || request.method === 'can-attach') {
    chrome.browserAction.setBadgeText({
      text: request.method === 'cannot-attach' ? 'D' : '',
      tabId
    });
    chrome.browserAction.setTitle({
      title: request.message,
      tabId
    });
  }
  else if (request.method === 'connected') {
    chrome.browserAction.setIcon({
      tabId,
      path: {
        '16': 'data/icons/active/16.png',
        '19': 'data/icons/active/19.png',
        '32': 'data/icons/active/32.png',
        '38': 'data/icons/active/38.png',
        '48': 'data/icons/active/48.png',
        '64': 'data/icons/active/64.png'
      }
    });
  }
  else if (request.method === 'disconnected') {
    chrome.browserAction.setIcon({
      tabId,
      path: {
        '16': 'data/icons/16.png',
        '19': 'data/icons/19.png',
        '32': 'data/icons/32.png',
        '38': 'data/icons/38.png',
        '48': 'data/icons/48.png',
        '64': 'data/icons/64.png'
      }
    });
  }
});

{
  const c = () => chrome.contextMenus.create({
    title: 'Open Test Page',
    id: 'open-test',
    contexts: ['browser_action']
  });
  chrome.runtime.onStartup.addListener(c);
  chrome.runtime.onInstalled.addListener(c);
}
chrome.contextMenus.onClicked.addListener(() => chrome.tabs.create({
  url: 'https://webbrowsertools.com/audio-test/'
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
