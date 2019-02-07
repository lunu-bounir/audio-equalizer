'use strict';

var range = {
  adjust(target, e) {
    if (e.type === 'mousemove') {
      target.movement = e.movementY;
    }
    else {
      target.offset = e.offsetY;
    }
  },
  prepare() {
    return [...document.querySelectorAll('.range')].map(e => {
      const div = document.createElement('div');
      let value = 50;
      Object.defineProperty(e, 'value', {
        get() {
          return value;
        },
        set(v) {
          v = Math.max(0, Math.min(100, v));
          const max = e.getBoundingClientRect().height;
          const top = v * max / 100;
          e.style = `--top: ${top - 12}px`;
          value = v;
        }
      });
      Object.defineProperty(e, 'movement', {
        set(movement) {
          const max = e.getBoundingClientRect().height;
          const top = e.value * max / 100 + movement;
          e.value = top / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      Object.defineProperty(e, 'offset', {
        set(offset) {
          const max = e.getBoundingClientRect().height;
          e.value = offset / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      e.textContent = '';
      e.appendChild(div);

      return e;
    });
  }
};

document.addEventListener('mousedown', e => {
  const parent = e.target.closest('.range');
  if (parent) {
    range.adjust(parent, e);
    //
    const adjust = range.adjust.bind(null, parent);
    document.addEventListener('mousemove', adjust);
    const observe = () => {
      document.removeEventListener('mousemove', adjust);
      document.removeEventListener('mouseup', observe);
    };
    document.addEventListener('mouseup', observe);
  }
});
