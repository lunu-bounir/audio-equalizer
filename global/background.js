/* globals utils */
'use strict';

var prefs = {
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

var webNavigation = {
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

{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
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
