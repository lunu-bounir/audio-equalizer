'use strict';

var Notify = function() {
  const fragment = this.fragment = document.createRange().createContextualFragment(`
<style>
  .notify {
    position: absolute;
    bottom: 10px;
    right: 10px;
  }
  .notify:empty {
    display: none;
  }
  .notify>div {
    display: flex;
    border: solid 1px;
    font-family: "Helvetica Neue",Helvetica,sans-serif;
    font-size: 13px;
    align-items: center;
    position: relative;
    margin-top: 2px;
  }
  .notify>div input {
    position: absolute;
    right: 0;
    top: 0;
    border: none;
    background: transparent;
    font-size: 17px;
    color: inherit;
    cursor: pointer;
    outline: none;
    opacity: 0.8;
  }
  .notify>div input:hover {
    opacity: 1;
  }
  .notify>div input:active {
    opacity: 0.3;
  }
  .notify>div>div {
    display: inline-flex;
    flex-direction: column;
    padding: 5px 15px;
    border-left: solid 1px;
  }
  .notify>div span {
    padding-top: 5px;
    width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  .notify>div svg {
    width: 60px;
  }
  .notify>div b {
    text-transform: capitalize;
  }
  .notify>div.warning {
    color: #8a6c30;
    background-color: #f9f4e3;
  }
  .notify>div.warning,
  .notify>div.warning div {
    border-color: #d9c481;
  }
  .notify>div.error {
    color: #ffe4ff;
    background-color: #f67975;
  }
  .notify>div.error,
  .notify>div.error div {
    border-color: #aa5956;
  }
  .notify>div.info {
    color: #236929;
    background-color: #f0fdf0;
  }
  .notify>div.info,
  .notify>div.info div {
    border-color: #9ac997;
  }
</style>
<div>
  <div>
    <b>Error</b>
    <span>This is a Text</span>
    <input type="button" value="&times;"/>
  </div>
</div>

<svg data-id="warning" width="24" height="24" viewBox="0 0 16 16" version="1.1">
  <path fill-rule="evenodd" fill="#8a6c30" d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"></path>
</svg>
<svg data-id="error" width="24" height="24" viewBox="0 0 14 16" version="1.1">
  <path fill-rule="evenodd" fill="#ffe4ff" d="M7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 1.3c1.3 0 2.5.44 3.47 1.17l-8 8A5.755 5.755 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zm0 11.41c-1.3 0-2.5-.44-3.47-1.17l8-8c.73.97 1.17 2.17 1.17 3.47 0 3.14-2.56 5.7-5.7 5.7z"></path>
</svg>
<svg data-id="info" width="24" height="24" viewBox="0 0 14 16" version="1.1">
  <path fill-rule="evenodd" fill="#236929" d="M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"></path>
</svg>
`);
  document.head.appendChild(fragment.querySelector('style'));
  const root = this.root = document.createElement('div');
  root.classList.add('notify');
  document.body.appendChild(root);
};
Notify.prototype.display = function(message, type = 'info', delay = 500000) {
  const div = this.fragment.querySelector('div').cloneNode(true);
  div.querySelector('b').textContent = type;
  div.querySelector('span').textContent = message;
  div.querySelector('input').onclick = () => {
    div.remove();
  };
  div.classList.add(type);
  const svg = this.fragment.querySelector(`svg[data-id="${type}"]`).cloneNode(true);
  div.insertBefore(svg, div.firstChild);
  this.root.appendChild(div);

  window.setTimeout(() => div.remove(), delay);
};
