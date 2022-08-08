//////////////////////////////////////////////////////////////////////
//	Copyright (C) Hiroshi SUGIMURA 2020.09.10
//////////////////////////////////////////////////////////////////////
'use strict'

const v3 = require('node-hue-api').v3;
const request = require('request-promise-native');
const os = require('os');
const cron = require('node-cron');

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
	gonnaInitialize: false,
	canceled: false,
	autoGet: true, // true = 自動的にGetをする
	autoGetWaitings: 0, // 自動取得待ちの個数
	autoGetEnabled: false,
	retryRemain: 3,     // リトライ回数
	debugMode: false,

	// public
	facilities: {},	// 全機器情報リスト
};

////////////////////////////////////////
// inner functions

// 時間つぶす関数
Hue.sleep = function (ms) {
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
Hue.initialize = async function ( userKey, userFunc, Options = { appName:'' ,deviceName:'', userName:'', autoGet: true, debugMode: false}) {

	// 二重初期化起動の禁止（初期化は何回やってもよいが、初期化中だけは初期化を受け付けない）
	if( Hue.gonnaInitialize ) {
		Hue.debugMode? console.log('-- prohibit double initialize (hue-hundler.js) '):0;
		return;
	}
	Hue.gonnaInitialize    = true;

	Hue.userKey    = userKey  == undefined ? ''        : userKey;
	Hue.userFunc   = userFunc == undefined ? Hue.dummy : userFunc;

	Hue.debugMode  = Options.debugMode == undefined || Options.debugMode == false ? false : true;   // true: show debug log
	Hue.autoGet    = Options.autoGet   != false ? true : false;	// 自動的なデータ送信の有無

	Hue.appName    = Options.appName    == undefined || Options.appName    === '' ? 'hueManager'  : Options.appName;
	Hue.deviceName = Options.deviceName == undefined || Options.deviceName === '' ? os.hostname() : Options.deviceName;
	Hue.userName   = Options.userName   == undefined || Options.userName   === '' ? 'sugilab'     : Options.userName;

	Hue.deviceType = Hue.appName + '#' + Hue.deviceName + ' ' + Hue.userName;

	Hue.canceled   = false; // 初期化のキャンセルシグナル
	Hue.autoGetEnabled = false; // autoGetが動いているか？
	Hue.retryRemain = 3;  // リトライ回数

	Hue.debugMode? console.log('==== hue-hundler.js ===='):0;
	Hue.debugMode? console.log('deviceType:', Hue.deviceType):0;
	Hue.debugMode? console.log('autoGet:', Hue.autoGet ):0;
	Hue.debugMode? console.log('debugMode:', Hue.debugMode ):0;
	Hue.debugMode? console.log('-- getBridge'):0;

	let bridges = [];
	while( bridges.length == 0 ) {
		try{
			bridges = await Hue.searchBridge(20000); // 20 second timeout
			if( bridges.length == 0 ) {
				// 失敗した
				Hue.userFunc(null, null, "Can't find bride.");
				if( Hue.retryRemain -= 1 ==0 ) { return ''; } // リトライ限界が来たのでkey無しで返却
			}
		}catch (e) {
			Hue.gonnaInitialize = false;
			throw new Error("Exception! Hue.searchBridge.");
		}
	}
	Hue.retryRemain = 3;  // リトライ回数復帰
	Hue.bridge = bridges[0];  // 一つしか管理しない

	Hue.debugMode? console.log('connect:', Hue.bridge.ipaddress):0;


	if( Hue.userKey === '' ) {  // 新規Link
		Hue.debugMode? console.log('new userKey and authorize.'):0;

		let hueurl;
		let res = 'unauthorized user';

		hueurl = 'http://' + Hue.bridge.ipaddress + '/api/newdeveloper';
		await request( { url: hueurl, method: 'get', timeout: 5000 } )
			.then( (body)=>{
				// console.log('----');
				if( body[0].error ) {
					// errorとはいえ，こちらが正規ルート = ユーザがいない，だからこれから登録処理という流れ
				}else{
					res = body[0].description;
				}
			} ).catch( (err) => {
				console.error( err );
				Hue.gonnaInitialize = false;
				throw err;
			} );

		Hue.debugMode? console.log('get Hue.userKey'):0;
		while( Hue.userKey == '' || !Hue.canceled) {  // keyを獲得するか、ユーザーがキャンセルするまで無限に実行
			// console.log( '.' );
			hueurl = 'http://' + Hue.bridge.ipaddress + '/api';
			Hue.debugMode? console.dir( Hue.deviceType ):0;

			await request({ url: hueurl, method: 'post', timeout: 5000, json: { devicetype: Hue.deviceType } })
				.then( (body)=>{
					// console.log('----');
					if( body[0] && body[0].success ) {
						Hue.userKey = body[0].success.username;
					}else{
						Hue.userFunc( Hue.bridge.ipaddress, 'Linking', null );
						// if( Hue.debugMode == true ) {
						// console.log('Please push Link button.');
						// }
					}
				} ).catch( (err) => {
					console.error( err );
					Hue.gonnaInitialize = false;
					throw err;
				} );
			await Hue.sleep(5 * 1000); // 5秒待つ
		}

		if( Hue.canceled ) {
			Hue.userFunc( Hue.bridge.ipaddress, 'Canceled', null );
			Hue.gonnaInitialize = false;
			return false;
		}

	}else{
		Hue.debugMode? console.log('use userKey: ', Hue.userKey ):0;
	}

	if( Hue.autoGet == true ) {
		Hue.autoGetStart();
		Hue.getState( Hue.bridge.ipaddress );
	}

	Hue.gonnaInitialize = false;
	return Hue.userKey;
};


Hue.initializeCancel = function() {
	Hue.debugMode? console.log( 'Hue.initialize is canceled. Please wait.' ):0;
	Hue.canceled = true;
}


Hue.getState = function( ip ) {
	// 状態取得
	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + '/lights';
	request({ url: hueurl, method: 'get', timeout: 5000 })
		.then( (rep) => {
			rep = Hue.objectSort(JSON.parse(rep));

			if( rep.error ) { // Linkしていない、keyが違うなど、受信エラー
				Hue.userFunc(Hue.bridge.ipaddress, rep, rep.error.description );
			}else{
				Hue.facilities[Hue.bridge.ipaddress] = {bridge: Hue.bridge, devices: rep};
				Hue.userFunc( Hue.bridge.ipaddress, rep, null);
			}
		} ).catch( (err) => {
			// Hue.userFunc( Hue.bridge.ipaddress, null, err);
			throw err;
		} );
};


Hue.setState = function( ip, url, json ) {
	// 状態セット
	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + url;
	request({ url: hueurl, method: 'put', headers:{"content-type":"application/json"},body: json, timeout: 5000 })
		.then( (rep) => {
			rep = Hue.objectSort(JSON.parse(rep));
			Hue.userFunc( Hue.bridge.ipaddress, rep, null);
		} ).catch( (err) => {
			// Hue.userFunc( Hue.bridge.ipaddress, null, err);
			console.error(err);
			throw err;
		} );
};


//////////////////////////////////////////////////////////////////////
// 定期的なデバイスの監視

// 監視を始める
Hue.autoGetStart = function () {
	// configファイルにobservationDevsが設定されていれば実施
	Hue.debugMode? console.log( 'Hue.autoGet is started.' ):0;

	if( Hue.autoGetEnabled ) { // すでに開始していたら何もしない
		return;
	}

	if( Hue.bridge.ipaddress ) { // IPがすでにないと例外になるので
		Hue.autoGetEnabled = cron.schedule('*/3 * * * *', () => {  // 3分毎にautoget
			Hue.getState( ip );
		});

		Hue.autoGetEnabled.start();
	}
};

// 監視をやめる
Hue.autoGetStop = function() {
	Hue.debugMode? console.log( 'Hue.autoGet is stoped.' ):0;

	if( Hue.autoGetEnabled ) { // すでに開始していたらautoget停止
		Hue.autoGetEnabled.stop();
	}

	Hue.autoGetEnabled = false;
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
