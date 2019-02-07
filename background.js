'use strict';

var prefs = {
  enabled: false,
  persist: false
};

var onStartup = () => chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  if (prefs.persist === false && prefs.enabled) {
    prefs.enabled = false;
    chrome.storage.local.set({
      enabled: false
    });
  }
  if (prefs.enabled) {
    webNavigation.install();
  }
});
chrome.runtime.onStartup.addListener(onStartup);
chrome.runtime.onInstalled.addListener(onStartup);

var webNavigation = {
  observe({frameId, url, tabId}) {
    if (url && (url.startsWith('http') || url.startsWith('ftp')) || url === 'about:blank') {
      chrome.tabs.executeScript(tabId, {
        file: 'data/inject.js',
        runAt: 'document_start',
        matchAboutBlank: true,
        frameId
      }, () => chrome.runtime.lastError);
    }
  },
  install() {
    console.log('installed');
    chrome.webNavigation.onCommitted.removeListener(webNavigation.observe);
    chrome.webNavigation.onCommitted.addListener(webNavigation.observe);
  },
  remove() {
    console.log('ermoved');
    chrome.webNavigation.onCommitted.removeListener(webNavigation.observe);
  }
};

chrome.storage.onChanged.addListener(ps => {
  if (ps.enabled) {
    webNavigation[ps.enabled.newValue ? 'install' : 'remove']();
  }
});
