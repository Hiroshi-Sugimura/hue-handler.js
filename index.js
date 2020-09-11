//////////////////////////////////////////////////////////////////////
//	Copyright (C) Hiroshi SUGIMURA 2020.09.10
//////////////////////////////////////////////////////////////////////
'use strict'

const v3 = require('node-hue-api').v3;
const request = require('request-promise-native');
const os = require('os');

//////////////////////////////////////////////////////////////////////
// philips hue，複数のhue gwを管理する能力はない
// クラス変数
let Hue = {
	// member
	// user config
  appName: 'hueHandler',
  deviceName: 'hostname',
  userName: 'sugilab',
  deviceType: '', // = appName + '#' + deviceName + ' ' + userName,
  userKey: '',  // default
  userFunc: {},  // callback function

	// private
  bridge: {},
  canceled: false,
  autoGet: true, // true = 自動的にGetをする
  autoGetInterval: 1000, // 自動取得のときに，すぐにGetせずにDelayする
  autoGetWaitings: 0, // 自動取得待ちの個数
  debugMode: false,
  autoGetTimerEnabled: false,
  autoGetTimerID: {},  // ID管理，Timeoutクラス

	// public
  facilities: {},	// 全機器情報リスト
};

////////////////////////////////////////
// inner functions

// 時間つぶす関数
Hue.sleep = async function (ms) {
	return new Promise(function(resolve) {
		setTimeout(function() {resolve()}, ms);
	})
}


// キーでソートしてからJSONにする
// 単純にJSONで比較するとオブジェクトの格納順序の違いだけで比較結果がイコールにならない
Hue.objectSort = function (obj) {
	// まずキーのみをソートする
	let keys = Object.keys(obj).sort();

	// 返却する空のオブジェクトを作る
	let map = {};

	// ソート済みのキー順に返却用のオブジェクトに値を格納する
	keys.forEach(function(key){
		map[key] = obj[key];
	});

	return map;
};

//////////////////////////////////////////////////////////////////////
// Hue特有の手続き
//////////////////////////////////////////////////////////////////////

// Hueのブリッジを探す（複数見つかるかもしれないので配列が返る）
Hue.searchBridge = async function(timeout) {
	let results;
	try{
		results = await v3.discovery.upnpSearch(timeout);
	}catch(e){
		throw e;
	}
	return results;
}

// 何もしない関数, userFunc is undef.
Hue.dummy = function() {
};

//////////////////////////////////////////////////////////////////////
// 初期化
Hue.initialize = async function ( userKey, userFunc, Options = { appName:'' ,deviceName:'', userName:'', autoGet: true, autoGetInterval: 60000, debugMode: false}) {

	Hue.userKey    = userKey  == undefined ? ''        : userKey;
	Hue.userFunc   = userFunc == undefined ? Hue.dummy : userFunc;

	Hue.debugMode         = Options.debugMode == undefined || Options.debugMode == false ? false : true;   // true: show debug log
	Hue.autoGet           = Options.autoGet   != false ? true : false;	// 自動的なデータ送信の有無
	Hue.autoGetInterval   = Options.autoGetInterval != undefined ? Options.autoGetInterval : 60000;	// 自動GetのDelay, default 1min

	Hue.appName    = Options.appName    == undefined || Options.appName    === '' ? 'hueManager'  : Options.appName;
	Hue.deviceName = Options.deviceName == undefined || Options.deviceName === '' ? os.hostname() : Options.deviceName;
	Hue.userName   = Options.userName   == undefined || Options.userName   === '' ? 'sugilab'     : Options.userName;

	Hue.deviceType = Hue.appName + '#' + Hue.deviceName + ' ' + Hue.userName;

	Hue.autoGetTimerEnabled = false; // autoGetが動いているか？
	Hue.autoGetTimerID = {};  // ID管理，Timeoutクラス

	if( Hue.debugMode == true ) {
		console.log('==== hue-manager.js ====');
		console.log('deviceType:', Hue.deviceType);
		console.log('autoGet:', Hue.autoGet, ', autoGetInterval: ', Hue.autoGetInterval );
		console.log('debugMode:', Hue.debugMode );

		console.log('-- getBridge');
	}
	let bridges = [];
	while( bridges.length == 0 ) {
		try{
			bridges = await Hue.searchBridge(10000); // 5 second timeout
			if( bridges.length == 0 ) {
				// 失敗したら30秒まつ
				Hue.sleep( 30000 );
			}
		}catch (e) {
			console.error(e);
		}
	}
	Hue.bridge = bridges[0];  // 一つしか管理しない

	if( Hue.debugMode == true ) {
		console.log('connect:', Hue.bridge.ipaddress);
	}

	if( Hue.userKey === '' ) {  // 新規Link
		let hueurl;
		let res = 'unauthorized user';

		hueurl = 'http://' + Hue.bridge.ipaddress + '/api/newdeveloper';
		await request( { url: hueurl, method: 'get', timeout: 5000 } )
			.then( (body)=>{
				console.log('----');
				body = JSON.parse(body);
				if( body[0].error ) {
					// errorとはいえ，こちらが正規ルート = ユーザがいない
					// console.error('error');
				}else{
					res = body[0].description;
				}
			} ).catch( (err) => {
				console.error( err );
				throw err;
			} );

		console.log('get Hue.userKey');
		while( Hue.userKey == '' ) {
			console.log( '.' );
			hueurl = 'http://' + Hue.bridge.ipaddress + '/api';
			console.dir( deviceType );
			request({ url: hueurl, method: 'post', timeout: 5000, json: { devicetype: deviceType } })
				.then( (body)=>{
					console.log('----');
					console.dir( body );
					if( body[0] && body[0].success ) {
						Hue.userKey = body[0].success.username;
					}else{
						Hue.userFunc( Hue.bridge.ipaddress, 'Linking', null );
						if( Hue.debugMode == true ) {
						console.log('Please push Link button.');
						}
					}
				} ).catch( (err) => {
					console.error( err );
					throw err;
				} );
			await Hue.sleep(5000);
		}
	}

	if( Hue.autoGet == true ) {
		Hue.autoGetStart( Hue.autoGetInterval );
		Hue.getState( Hue.bridge.ipaddress );
	}

	return Hue.userKey;
};

// request(options, function (error, response, body) { })
Hue.getState = function( ip ) {
	// 状態取得
	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + '/lights';
	request({ url: hueurl, method: 'get', timeout: 5000 })
		.then( (rep) => {
			Hue.facilities[Hue.bridge.ipaddress] = {bridge: Hue.bridge, devices: Hue.objectSort(JSON.parse(rep))};
			Hue.userFunc( Hue.bridge.ipaddress, rep, null);
		} ).catch( (err) => {
			// Hue.userFunc( Hue.bridge.ipaddress, null, err);
			throw err;
		} );
};


Hue.setState = function( ip, stateJson ) {
	// 状態取得
	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + '/lights';
	request({ url: hueurl, method: 'post', timeout: 5000 })
		.then( (rep) => {
			Hue.userFunc( Hue.bridge.ipaddress, rep, null);
		} ).catch( (err) => {
			// Hue.userFunc( Hue.bridge.ipaddress, null, err);
			throw err;
		} );
};


//////////////////////////////////////////////////////////////////////
// 定期的なデバイスの監視

// 実際に監視する関数
Hue.autoGetInner = function( ip, interval ) {
	Hue.getState( ip );

	// 処理をしたので次のタイマーをセット
	if( Hue.autoGetTimerEnabled == true ) {  // 次もやるかチェックしておく
		Hue.autoGetTimerSet( ip, interval );
	}
};

// タイマーで動く関数をセット
Hue.autoGetTimerSet = function( ip, interval ) {
	Hue.autoGetTimerID[ip] = setTimeout( Hue.autoGetInner, interval, ip, interval );
};


// インタフェース，監視を始める
Hue.autoGetStart = function ( interval ) {
	// configファイルにobservationDevsが設定されていれば実施
	if( Hue.debugMode ) {
		console.log( 'Hue.autoGet is started.', interval, 'ms' );
	}
	if( Hue.autoGetTimerEnabled == true ) { // すでに開始していたら何もしない
		return;
	}
	Hue.autoGetTimerEnabled = true;

	if( Hue.bridge.ipaddress ) { // IPがすでにないと例外になるので
		Hue.autoGetTimerSet( Hue.bridge.ipaddress, interval );
	}
};

// インタフェース，監視をやめる
Hue.autoGetStop = function() {
	if( Hue.debugMode ) {
		console.log( 'Hue.autoGet is stoped.' );
	}

	Hue.autoGetTimerEnabled = false;

	for( let key in autoGetTimerID ) { // 現在登録されているタイマーを全部消す
		clearTimeout ( Hue.autoGetTimerID[key] );
	}
};


//////////////////////////////////////////////////////////////////////
// facilitiesの定期的な監視
// ネットワーク内のEL機器全体情報を更新したらユーザの関数を呼び出す
// facilitiesにて変更あれば呼び出される
Hue.setObserveFacilities = function ( interval, onChanged ) {
	let oldVal = JSON.stringify(Hue.objectSort(Hue.facilities));
	const onObserve = function() {
		const newVal = JSON.stringify(Hue.objectSort(Hue.facilities));
		if ( oldVal == newVal ) return;
		onChanged();
		oldVal = newVal;
	};

	setInterval( onObserve, interval );
};


module.exports = Hue;

//////////////////////////////////////////////////////////////////////
// EOF
//////////////////////////////////////////////////////////////////////
