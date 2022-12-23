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
let hueKey = '';  // 分かっている場合はここに記述，初めての時は空文字でよい


// Hue受信後の処理
let Huereceived = function(rIP, response, error) {

	console.log('-- recenved');

	if( error ) {
		console.error( 'Error:', error );
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


( async ()=> {
	try{
		hueKey = await Hue.initialize( hueKey, Huereceived, {debugMode: false} );
	}catch(e){
		hueKey = '';
		console.error('initialize error.');
		console.dir(e);
	}

	if( hueKey != '' ) {  // 接続成功
		// Hue.facilitiesの定期的監視
		Hue.setObserveFacilities( 3000, () => {
			console.log('-- Observe Facilities');
			console.log( JSON.stringify(Hue.facilities, null, '  ') );
		});

		Hue.setState( "/lights/1/state", '{"on":true}' );  // ライトONの例
		await Hue.sleep(3000);
		Hue.setState( "/lights/1/state", '{"on":false}' );  // ライトOFFの例
	}

})();
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

- 初期化: Hue.initialize( key = '', callback, debugmode = {debugMode: false} );

```
// Hue受信後の処理
let Huereceived = function(gwIP, response, error) {

	console.log('-- recenved');

	if( error ) {
		console.error( error );
		return;
	}

	switch( response ) {  // レスポンスを処理
		case 'Linking':
		console.log('Please push Link button.');
		break;

		case 'Canceled':
		console.log('Please push Link button.');
		break;

		default:
		console.log('gwIP:', gwIP);
		console.log('res:', response);
	}
};


// Hue.initialize( hueKey, Huereceived );
hueKey = Hue.initialize( hueKey, Huereceived, {debugMode: true} );
```

- 初期化中のキャンセル
```
Hue.initializeCancel();
```

- 監視: Hue.setObserveFacilities( interval, callback )


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

## Using other modules and License

- このモジュールで使用している、他モジュールとライセンスは下記のようになっています。このリストはlicense-chekerで作製しています。
- Here is modules and license using this module. The list is extracted by license-checker function.
	- このリストの更新は少し遅いので参考情報程度にしてください。
	- The updating this list is very slow, you can not use to impotant information directly.

```
license-checker --csv
```

- List

```
"ajv@6.12.4","MIT","https://github.com/ajv-validator/ajv"
"asn1@0.2.4","MIT","https://github.com/joyent/node-asn1"
"assert-plus@1.0.0","MIT","https://github.com/mcavage/node-assert-plus"
"asynckit@0.4.0","MIT","https://github.com/alexindigo/asynckit"
"aws-sign2@0.7.0","Apache-2.0","https://github.com/mikeal/aws-sign"
"aws4@1.10.1","MIT","https://github.com/mhart/aws4"
"axios@0.21.4","MIT","https://github.com/axios/axios"
"bcrypt-pbkdf@1.0.2","BSD-3-Clause","https://github.com/joyent/node-bcrypt-pbkdf"
"bottleneck@2.19.5","MIT","https://github.com/SGrondin/bottleneck"
"caseless@0.12.0","Apache-2.0","https://github.com/mikeal/caseless"
"combined-stream@1.0.8","MIT","https://github.com/felixge/node-combined-stream"
"core-util-is@1.0.2","MIT","https://github.com/isaacs/core-util-is"
"dashdash@1.14.1","MIT","https://github.com/trentm/node-dashdash"
"delayed-stream@1.0.0","MIT","https://github.com/felixge/node-delayed-stream"
"ecc-jsbn@0.1.2","MIT","https://github.com/quartzjer/ecc-jsbn"
"extend@3.0.2","MIT","https://github.com/justmoon/node-extend"
"extsprintf@1.3.0","MIT","https://github.com/davepacheco/node-extsprintf"
"fast-deep-equal@3.1.3","MIT","https://github.com/epoberezkin/fast-deep-equal"
"fast-json-stable-stringify@2.1.0","MIT","https://github.com/epoberezkin/fast-json-stable-stringify"
"follow-redirects@1.15.1","MIT","https://github.com/follow-redirects/follow-redirects"
"forever-agent@0.6.1","Apache-2.0","https://github.com/mikeal/forever-agent"
"form-data@2.3.3","MIT","https://github.com/form-data/form-data"
"get-ssl-certificate@2.3.3","MIT","https://github.com/johncrisostomo/get-ssl-certificate"
"getpass@0.1.7","MIT","https://github.com/arekinath/node-getpass"
"har-schema@2.0.0","ISC","https://github.com/ahmadnassri/har-schema"
"har-validator@5.1.5","MIT","https://github.com/ahmadnassri/node-har-validator"
"http-signature@1.2.0","MIT","https://github.com/joyent/node-http-signature"
"hue-handler@1.1.0","MIT","https://github.com/Hiroshi-Sugimura/hue-handler.js"
"is-typedarray@1.0.0","MIT","https://github.com/hughsk/is-typedarray"
"isstream@0.1.2","MIT","https://github.com/rvagg/isstream"
"jsbn@0.1.1","MIT","https://github.com/andyperlitch/jsbn"
"json-schema-traverse@0.4.1","MIT","https://github.com/epoberezkin/json-schema-traverse"
"json-schema@0.2.3","AFLv2.1,BSD","https://github.com/kriszyp/json-schema"
"json-stringify-safe@5.0.1","ISC","https://github.com/isaacs/json-stringify-safe"
"jsprim@1.4.1","MIT","https://github.com/joyent/node-jsprim"
"lodash@4.17.20","MIT","https://github.com/lodash/lodash"
"mime-db@1.44.0","MIT","https://github.com/jshttp/mime-db"
"mime-types@2.1.27","MIT","https://github.com/jshttp/mime-types"
"node-cron@3.0.1","ISC","https://github.com/merencia/node-cron"
"node-hue-api@4.0.11","Apache-2.0","https://github.com/peter-murray/node-hue-api"
"oauth-sign@0.9.0","Apache-2.0","https://github.com/mikeal/oauth-sign"
"performance-now@2.1.0","MIT","https://github.com/braveg1rl/performance-now"
"psl@1.8.0","MIT","https://github.com/lupomontero/psl"
"punycode@2.1.1","MIT","https://github.com/bestiejs/punycode.js"
"qs@6.5.2","BSD-3-Clause","https://github.com/ljharb/qs"
"request-promise-core@1.1.4","ISC","https://github.com/request/promise-core"
"request-promise-native@1.0.9","ISC","https://github.com/request/request-promise-native"
"request@2.88.2","Apache-2.0","https://github.com/request/request"
"safe-buffer@5.2.1","MIT","https://github.com/feross/safe-buffer"
"safer-buffer@2.1.2","MIT","https://github.com/ChALkeR/safer-buffer"
"sshpk@1.16.1","MIT","https://github.com/joyent/node-sshpk"
"stealthy-require@1.1.1","ISC","https://github.com/analog-nico/stealthy-require"
"tough-cookie@2.5.0","BSD-3-Clause","https://github.com/salesforce/tough-cookie"
"tunnel-agent@0.6.0","Apache-2.0","https://github.com/mikeal/tunnel-agent"
"tweetnacl@0.14.5","Unlicense","https://github.com/dchest/tweetnacl-js"
"uri-js@4.4.0","BSD-2-Clause","https://github.com/garycourt/uri-js"
"uuid@3.4.0","MIT","https://github.com/uuidjs/uuid"
"verror@1.10.0","MIT","https://github.com/davepacheco/node-verror"
```

- Apache-2.0 License is Here. (https://www.apache.org/licenses/LICENSE-2.0)
- ISC License is Here. (https://opensource.org/licenses/ISC)
- MIT License is Here. (https://opensource.org/licenses/mit-license.php)
- BSD-3-Clause is Here. (https://opensource.org/licenses/BSD-3-Clause)
- AFLv2.1 is Here. (https://spdx.org/licenses/AFL-2.1.html)


## Log

- 2.0.0 request-promise-nativeがdeprecatedになっているので、base moduleをaxiosに変更する。
- 1.2.0 setStateのobject対応
- 1.1.6 debug追加
- 1.1.5 cancel条件のbug fix
- 1.1.4 cancelタイミングを増やした
- 1.1.3 二重禁止の時の戻り値を申請したhueKyeを返却することとした
- 1.1.2 cancelのときのinitializeの戻り値は''とした
- 1.1.1 initialize中initializeを禁止
- 1.1.0 監視をnode-cronにした、cancel機能追加
- 1.0.0 失敗時のリトライ処理，async/await調整，
- 0.2.2 setStatus
- 0.2.1 manage errors
- 0.2.0 renew stracture
- 0.1.0 first published
- 0.0.1 start up
