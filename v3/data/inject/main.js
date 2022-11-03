const port = document.getElementById('iea-port');
port.remove();

{
  const bands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
  const map = new Map();

  const {connect} = AudioNode.prototype;

  const attach = source => {
    const {context} = source;
    const filters = {
      preamp: context.createGain(),
      balance: context.createStereoPanner()
    };
    filters.preamp.gain.value = isNaN(port.dataset.preamp) ? 1 : Number(port.dataset.preamp);
    source.connect(filters.preamp);
    filters.balance.pan.value = isNaN(port.dataset.pan) ? 1 : Number(port.dataset.pan);
    filters.preamp.connect(filters.balance);
    bands.forEach((band, i) => {
      const filter = context.createBiquadFilter();
      filter.frequency.value = band;
      filter.gain.value = isNaN(port.dataset[band]) ? 1 : Number(port.dataset[band]);
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
    if (port.dataset.mono === 'true') {
      context.destination.channelCount = 1;
    }
    map.set(source, filters);

    if (port.dataset.enabled === 'false') {
      return connect.call(source, context.destination);
    }
    else {
      port.dispatchEvent(new Event('connected'));
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
      catch (e) {
        reject(e);
      }
    });
  });

  const detach = () => map.forEach((filters, source) => {
    source.disconnect();
    connect.call(source, source.context.destination);
    port.dispatchEvent(new Event('disconnected'));
  });

  const reattach = () => {
    map.forEach((filters, source) => {
      source.disconnect();
      source.connect(filters.preamp);
      connect.call(filters['16000'], source.context.destination);
      port.dispatchEvent(new Event('connected'));
    });
    if (map.size) {
      port.dispatchEvent(new Event('connected'));
    }
  };

  AudioNode.prototype.connect = new Proxy(AudioNode.prototype.connect, {
    apply(target, self, args) {
      const [node] = args;

      if (node && node instanceof AudioDestinationNode) {
        try {
          return attach(self);
        }
        catch (e) {
          console.error(e);
          port.dispatchEvent(new Event('cannot-attach'));
        }
      }

      return Reflect.apply(target, self, args);
    }
  });

  const convert = target => {
    if (
      target.src && target.crossOrigin !== 'anonymous' &&
      target.src.startsWith('http') && target.src.startsWith(origin) === false
    ) {
      console.warn('cannot equalize; skipped due to cors', target.src);
      port.dispatchEvent(new Event('cannot-attach'));
    }
    else {
      source(target).then(attach).then(() => {
        port.dispatchEvent(new Event('can-attach'));
      }).catch(() => {});
    }
  };

  window.addEventListener('playing', e => convert(e.target), true);

  Audio.prototype.play = new Proxy(Audio.prototype.play, {
    apply(target, self, args) {
      try {
        convert(self);
      }
      catch (e) {
        console.error(e);
      }

      return Reflect.apply(target, self, args);
    }
  });

  HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
    apply(target, self, args) {
      if (this.isConnected === false) {
        try {
          convert(self);
        }
        catch (e) {
          console.error(e);
        }
      }

      return Reflect.apply(target, self, args);
    }
  });

  port.addEventListener('levels-changed', () => map.forEach(filters => {
    bands.forEach(band => {
      filters[band].gain.value = Number(port.dataset[band]);
    });
  }));
  port.addEventListener('pan-changed', () => map.forEach(filters => {
    filters.balance.pan.value = Number(port.dataset.pan);
  }));
  port.addEventListener('preamp-changed', () => map.forEach(filters => {
    filters.preamp.gain.value = Number(port.dataset.preamp);
  }));
  port.addEventListener('mono-changed', () => map.forEach(filters => {
    const {destination} = filters.preamp.context;
    destination.channelCount = port.dataset.mono === 'true' ? 1 : destination.maxChannelCount;
  }));
  port.addEventListener('enabled-changed', () => {
    if (port.dataset.enabled === 'false') {
      detach();
    }
    else {
      reattach();
    }
  });
}
