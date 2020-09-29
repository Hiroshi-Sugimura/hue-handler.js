# Overview

hue-handler

# Install

下記コマンドでモジュールをインストールできます．

You can install the module as following command.


```bash
npm i hue-handler
```


# Demo, example

```

const Hue = require('hue-handler');

////////////////////////////////////////
// test config
let hueKey = 'KKHocxnOwlkBCuPUCLc2Nc1hSYESV2G2LSxEn3kt';


// Hue受信後の処理
let Huereceived = function(rIP, response, error) {

	console.log('-- recenved');

	if( error ) {
		console.error( error );
		return;
	}

	if( response == 'Linking' ) {
		console.log('Please push Link button.');
	}else{
		console.dir(rIP);
		console.dir(response);
		console.dir(error);
	}
};


// Hue.initialize( hueKey, Huereceived );
hueKey = Hue.initialize( hueKey, Huereceived, {debugMode: true} );


// Hue.facilitiesの定期的監視
Hue.setObserveFacilities( 3000, () => {
	console.dir( Hue.facilities );
});
```


# Data stracture


Hue.facilities is following stracture.

```
{
  '192.168.2.192': {
    bridge: {
      name: 'Philips hue (192.168.2.192)',
      manufacturer: 'Royal Philips Electronics',
      ipaddress: '192.168.2.192',
      model: [Object],
      version: [Object],
      icons: [Array]
    },
    devices: {
      '1': [Object],
      '3': [Object],
      '4': [Object],
      '6': [Object],
      '7': [Object],
      '8': [Object],
      '9': [Object],
      '10': [Object]
    }
  }
}
```

# API

## 初期化と受信, 監視, initialize, receriver callback and observation

- 初期化

```
// Hue受信後の処理
let Huereceived = function(gwIP, response, error) {

	console.log('-- recenved');

	if( error ) {
		console.error( error );
		return;
	}

	if( response == 'Linking' ) {
		console.log('Please push Link button.');
		return;
	}

	console.dir(gwIP);
	console.dir(response);
};


// Hue.initialize( hueKey, Huereceived );
hueKey = Hue.initialize( hueKey, Huereceived, {debugMode: true} );
```

- 監視

```
// Hue.facilitiesの定期的監視
Hue.setObserveFacilities( 3000, () => {
	console.dir( Hue.facilities );
});
```

# Knowhow

```
{
  '1': {
    state: {
      on: false,
      bri: 254,
      hue: 65104,
      sat: 253,
      effect: 'none',
      xy: [Array],
      ct: 153,
      alert: 'none',
      colormode: 'xy',
      reachable: true
    },
    type: 'Extended color light',
    name: 'Hue Lamp',
    modelid: 'LCT001',
    manufacturername: 'Philips',
    uniqueid: '00:17:88:01:00:e1:0d:0b-0b',
    swversion: '5.127.1.26581'
  },
```

# meta data


## Authors

神奈川工科大学  創造工学部  ホームエレクトロニクス開発学科; Dept. of Home Electronics, Faculty of Creative Engineering, Kanagawa Institute of Technology

杉村　博; SUGIMURA, Hiroshi


## License

MIT License

```
-- License summary --
o Commercial use
o Modification
o Distribution
o Private use
x Liability
x Warranty
```


## Log

- 0.2.2 setStatus
- 0.2.1 manage errors
- 0.2.0 renew stracture
- 0.1.0 first published
- 0.0.1 start up
