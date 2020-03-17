/* globals utils */
'use strict';

const prefs = {
  enabled: false,
  persist: false
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  if (prefs.enabled) {
    webNavigation.install();
  }
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
  if (request.method === 'cannot-attach') {
    chrome.browserAction.disable(sender.tab.id);
    chrome.browserAction.setBadgeText({
      text: 'D',
      tabId
    });
    chrome.browserAction.setTitle({
      title: request.message || 'Unknown Error',
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

const webNavigation = {
  observe(d) {
    if (utils.filter(d)) {
      const {frameId, tabId} = d;
      chrome.tabs.executeScript(tabId, {
        file: 'data/inject.js',
        runAt: 'document_start',
        matchAboutBlank: true,
        frameId
      }, () => chrome.runtime.lastError);
    }
  },
  install() {
    chrome.webNavigation.onCommitted.removeListener(webNavigation.observe);
    chrome.webNavigation.onCommitted.addListener(webNavigation.observe);
  },
  remove() {
    chrome.webNavigation.onCommitted.removeListener(webNavigation.observe);
  }
};

chrome.storage.onChanged.addListener(ps => {
  if (ps.enabled) {
    webNavigation[ps.enabled.newValue ? 'install' : 'remove']();
  }
});

/* FAQs & Feedback */
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  if (navigator.webdriver !== true) {
    onInstalled.addListener(({reason, previousVersion}) => {
      chrome.storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            chrome.tabs.create({
              url: page + '&version=' + version +
                (previousVersion ? '&p=' + previousVersion : '') +
                '&type=' + reason,
              active: reason === 'install'
            });
            chrome.storage.local.set({'last-update': Date.now()});
          }
        }
      });
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
