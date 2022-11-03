'use strict';

var range = {
  adjust(target, e) {
    const hor = target.getAttribute('type') === 'horizontal';
    if (e.type === 'mousemove') {
      target.movement = hor ? e.movementX : e.movementY;
    }
    else {
      target.offset = hor ? e.offsetX : e.offsetY;
    }
  },
  prepare() {
    return [...document.querySelectorAll('.range')].map(e => {
      const hor = e.getAttribute('type') === 'horizontal';
      const shadow = e.attachShadow({mode: 'closed'});

      const div = document.createElement('div');
      let value = 50;
      Object.defineProperty(e, 'value', {
        get() {
          return value;
        },
        set(v) {
          v = Math.max(0, Math.min(100, v));
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          const val = v * max / 100;
          if (hor) {
            e.style.setProperty('--left', `${val - 12}px`);
          }
          else {
            e.style.setProperty('--top', `${val - 12}px`);
          }
          value = v;
        }
      });
      Object.defineProperty(e, 'movement', {
        set(movement) {
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          const top = e.value * max / 100 + movement;
          e.value = top / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      Object.defineProperty(e, 'offset', {
        set(offset) {
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          e.value = offset / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      e.textContent = '';
      shadow.appendChild(div);


      const style = document.createElement('style');
      style.textContent = `
        :host {
          ${hor ? 'width: var(--width, 120px)' : 'height: var(--height, 120px)'};
          ${hor ? 'height: 12px' : 'width: 12px'};
          ${hor ? '--left: calc(50% - 12px)' : '--top: calc(50% - 12px)'};
          user-select: none;
          margin-left: 8px;
          cursor: grab;
          display: inline-block;
        }
        :host>div {
          pointer-events: none;
          ${hor ? 'height: 4px' : 'width: 4px'};
          ${hor ? 'width: 100%' : 'height: 100%'};
          background-color: #cccbca;
          position: relative;
          border-radius: 2px;
        }
        :host>div::before {
          content: '';
          position: absolute;
          ${hor ? 'top: 7px' : 'left: 7px'};
          ${hor ? 'height: 3px' : 'width: 3px'};
          ${hor ? 'width: 100%' : 'height: 100%'};
          background: repeating-linear-gradient(${hor ? '90deg' : '0deg'}, transparent 0, transparent calc(100% / 18), #cccbca 5.55%, #cccbca calc(100% / 18 + 1px), transparent calc(100% / 18 + 1px), transparent calc(100% / 9));
        }
        :host>div::after {
          content: '';
          position: absolute;
          ${hor ? 'top: -8px' : 'left: -7px'};
          ${hor ? 'left: var(--left)' : 'top: var(--top)'};
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' width='24'%3E%3Cpolygon points='${hor ? '0 0, 0 11, 10 23, 11 23, 21 11, 21 0' : '0 0, 11 0, 23 10, 23 11, 11 21, 0 21'}' fill='%234b4e50' /%3E%3C/svg%3E");
          background-size: 50%;
          background-position: center center;
          background-repeat: no-repeat;
          width: 22px;
          height: 24px;
        }
      `;
      shadow.appendChild(style);

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
