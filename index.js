//////////////////////////////////////////////////////////////////////
//	Copyright (C) Hiroshi SUGIMURA 2020.09.10
//////////////////////////////////////////////////////////////////////
'use strict'

const v3 = require('node-hue-api').v3;
const axios = require('axios');
const os = require('os');
const cron = require('node-cron');

//////////////////////////////////////////////////////////////////////
/**
 * Philips Hue管理用オブジェクト
 * @namespace Hue
 */
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
	retryRemain: 3,     // リトライ回数
	debugMode: false,

	// public
	facilities: {},	// 全機器情報リスト
};

////////////////////////////////////////
// inner functions

/**
 * 指定時間スリープする
 * @memberof Hue
 * @param {number} ms 待機時間(ミリ秒)
 * @returns {Promise<void>}
 */
Hue.sleep = function (ms) {
	return new Promise(function (resolve) {
		setTimeout(function () { resolve() }, ms);
	})
};


/**
 * オブジェクトをキーでソートして返す
 * @memberof Hue
 * @param {object} obj ソート対象オブジェクト
 * @returns {object} ソート済みオブジェクト
 */
Hue.objectSort = function (obj) {
	// まずキーのみをソートする
	let keys = Object.keys(obj).sort();

	// 返却する空のオブジェクトを作る
	let map = {};

	// ソート済みのキー順に返却用のオブジェクトに値を格納する
	keys.forEach(function (key) {
		map[key] = obj[key];
	});

	return map;
};


//////////////////////////////////////////////////////////////////////
// Hue特有の手続き
//////////////////////////////////////////////////////////////////////

/**
 * Hue Bridgeをネットワーク内から検索する
 * @memberof Hue
 * @param {number} timeout タイムアウト時間(ミリ秒)
 * @returns {Promise<Array>} 発見されたブリッジのリスト
 * @throws {Error} 検索エラー時
 */
Hue.searchBridge = async function (timeout) {
	return await v3.discovery.upnpSearch(timeout);
}

/**
 * ダミーコールバック関数
 * @memberof Hue
 */
Hue.dummy = function () {
};

//////////////////////////////////////////////////////////////////////
/**
 * Hueハンドラの初期化
 * @memberof Hue
 * @param {string} userKey 既存のHueユーザーキー（なければ空文字）
 * @param {function} userFunc 状態変更時に呼ばれるコールバック関数 (ip, response, error) => {}
 * @param {object} [Options] オプション設定
 * @param {string} [Options.appName='hueManager'] アプリケーション名
 * @param {string} [Options.deviceName=hostname] デバイス名
 * @param {string} [Options.userName='sugilab'] ユーザー名
 * @param {boolean} [Options.debugMode=false] デバッグモード有効化
 * @param {string} [Options.bridgeIp] ブリッジのIP指定（指定時は自動検索スキップ）
 * @returns {Promise<string>} 取得または確認されたUserKey
 */
Hue.initialize = async function (userKey, userFunc, Options = { appName: '', deviceName: '', userName: '', debugMode: false }) {

	// 二重初期化起動の禁止（初期化は何回やってもよいが、初期化中だけは初期化を受け付けない）
	if (Hue.gonnaInitialize) {
		if (Hue.debugMode) console.log('-- Hue.initialize, prohibit double initialize (hue-hundler.js) ');
		return Hue.userKey;
	}
	Hue.gonnaInitialize = true;

	Hue.userKey = userKey == undefined ? '' : userKey;
	Hue.userFunc = userFunc == undefined ? Hue.dummy : userFunc;

	Hue.debugMode = Options.debugMode == undefined || Options.debugMode == false ? false : true;   // true: show debug log

	Hue.appName = Options.appName == undefined || Options.appName === '' ? 'hueManager' : Options.appName;
	Hue.deviceName = Options.deviceName == undefined || Options.deviceName === '' ? os.hostname() : Options.deviceName;
	Hue.userName = Options.userName == undefined || Options.userName === '' ? 'sugilab' : Options.userName;

	Hue.deviceType = Hue.appName + '#' + Hue.deviceName + ' ' + Hue.userName;

	Hue.canceled = false; // 初期化のキャンセルシグナル
	Hue.retryRemain = 3;  // リトライ回数

	if (Hue.debugMode) console.log('==== hue-hundler.js ====');
	if (Hue.debugMode) console.log('userKey:', Hue.userKey);
	if (Hue.debugMode) console.log('deviceType:', Hue.deviceType);
	if (Hue.debugMode) console.log('debugMode:', Hue.debugMode);
	if (Hue.debugMode) console.log('-- Hue.initialize, getBridge');

	//==========================================================================
	// ブリッジの発見
	let bridges = [];
	if (Options.bridgeIp) {
		if (Hue.debugMode) console.log('-- Hue.initialize, use bridgeIp:', Options.bridgeIp);
		bridges = [{ ipaddress: Options.bridgeIp }];
		Hue.bridge = bridges[0];
	}

	while (bridges.length == 0) {
		try {
			if (Hue.canceled) { // 初期化のキャンセルシグナルが来たので終わる
				Hue.userFunc(Hue.bridge.ipaddress, 'Canceled', null);
				Hue.gonnaInitialize = false;
				return Hue.userKey; // cancelの時はkeyを何も返さない
			}

			bridges = await Hue.searchBridge(20000); // 20 second timeout
			if (bridges.length == 0) {
				// 失敗した
				Hue.userFunc(null, null, "Can't find bridge.");
				Hue.retryRemain -= 1;
				if (Hue.retryRemain === 0) { return Hue.userKey; } // リトライ限界が来たのでkey無しで返却
			}
		} catch (e) {
			Hue.gonnaInitialize = false;
			throw new Error("Exception! Hue.searchBridge.");
		}
	}
	Hue.retryRemain = 3;  // リトライ回数復帰
	Hue.bridge = bridges[0];  // 一つしか管理しない

	if (Hue.debugMode) console.log('-- Hue.initialize, connect:', Hue.bridge.ipaddress);

	//==========================================================================
	// Link
	if (Hue.userKey === '') {  // 新規Link
		if (Hue.debugMode) console.log('-- Hue.initialize, new userKey and authorize.');

		if (Hue.canceled) { // 初期化のキャンセルシグナルが来たので終わる
			Hue.userFunc(Hue.bridge.ipaddress, 'Canceled', null);
			Hue.gonnaInitialize = false;
			return Hue.userKey; // cancelの時はkeyを何も返さない
		}

		let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/newdeveloper';
		let res = 'unauthorized user';
		try {
			const resData = await axios.get(hueurl, { timeout: 5000 });
			let body = resData.data;
			// console.log('----');
			if (body[0].error) {
				// errorとはいえ，こちらが正規ルート = ユーザがいない，だからこれから登録処理という流れ
			} else {
				res = body[0].description;
			}
		} catch (err) {
			console.error(err);
			Hue.gonnaInitialize = false;
			throw err;
		}

		if (Hue.debugMode) console.log('-- Hue.initialize, get Hue.userKey');
		while (Hue.userKey == '' && Hue.canceled == false) {  // keyを獲得するか、ユーザーがキャンセルするまで無限に実行
			if (Hue.canceled) { // 初期化のキャンセルシグナルが来たので終わる
				Hue.userFunc(Hue.bridge.ipaddress, 'Canceled', null);
				Hue.gonnaInitialize = false;
				return Hue.userKey; // cancelの時はkeyを何も返さない
			}

			hueurl = 'http://' + Hue.bridge.ipaddress + '/api';
			if (Hue.debugMode) console.log('-- Hue.initialize, deviceType:', Hue.deviceType);

			// await axios.post( hueurl, {timeout: 5000, json: { devicetype: Hue.deviceType }} )
			const reqjson = { devicetype: Hue.deviceType };
			try {
				const resData = await axios.post(hueurl, reqjson);
				let body = resData.data;
				if (body[0] && body[0].success) {
					if (Hue.debugMode) console.log('Hue.initialize, Link is succeeded.');
					Hue.userKey = body[0].success.username;
				} else {
					// console.log(body);
					Hue.userFunc(Hue.bridge.ipaddress, 'Linking', null);
					// if( Hue.debugMode == true ) {
					// console.log('Please push Link button.');
					// }
				}
			} catch (err) {
				console.error(err);
				Hue.gonnaInitialize = false;
				throw err;
			}
			await Hue.sleep(5 * 1000); // 5秒待つ
		}

	} else {
		Hue.debugMode ? console.log('Hue.initialize, use userKey: ', Hue.userKey) : 0;
	}

	await Hue.getState();

	Hue.gonnaInitialize = false;  // 初期化中フラグ、初期化中キャンセルに利用
	return Hue.userKey;
};


/**
 * 初期化処理をキャンセルする
 * @memberof Hue
 */
Hue.initializeCancel = function () {
	if (Hue.debugMode) console.log('Hue.initializeCancel(). Please wait.');
	Hue.canceled = true;
};


/**
 * 現在の状態を取得する
 * @memberof Hue
 * @returns {Promise<void>} 完了時にコールバックが呼ばれる
 */
Hue.getState = async function () {
	// 状態取得
	if (Hue.debugMode) console.log('Hue.getState()');

	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + '/lights';
	try {
		const res = await axios.get(hueurl, { timeout: 5000 });
		let rep = res.data;
		rep = Hue.objectSort(rep);

		if (rep.error) {  // Linkしていない、keyが違うなど、受信エラー
			Hue.userFunc(Hue.bridge.ipaddress, rep, rep.error.description);
		} else {
			Hue.facilities[Hue.bridge.ipaddress] = { bridge: Hue.bridge, devices: rep };
			Hue.userFunc(Hue.bridge.ipaddress, rep, null);
		}
	} catch (err) {
		// Hue.userFunc( Hue.bridge.ipaddress, null, err);
		throw err;
	}
};


/**
 * 状態を設定（制御）する
 * @memberof Hue
 * @param {string} url 制御対象のAPIエンドポイント (e.g. '/lights/1/state')
 * @param {object|string} bodyObj 制御内容のJSONオブジェクトまたは文字列
 * @returns {Promise<void>} 完了時にコールバックが呼ばれる
 */
Hue.setState = async function (url, bodyObj) {
	// 状態セット
	if (Hue.debugMode) console.log('Hue.setState() url:', url, 'bodyObj:', bodyObj);

	// 引数がObjectだっつってるのにobject入れてくる場合がある。
	if (typeof bodyObj == 'string') {
		bodyObj = JSON.parse(bodyObj);
	}

	let hueurl = 'http://' + Hue.bridge.ipaddress + '/api/' + Hue.userKey + url;
	let rep;
	try {
		const res = await axios.put(hueurl, bodyObj, { headers: { "Content-Type": "application/json" }, timeout: 5000 });
		rep = res.data;
	} catch (err) {
		// Hue.userFunc( Hue.bridge.ipaddress, null, err);
		// console.error(err);
		throw err;
	}

	if (Hue.debugMode) console.log('Hue.setState() rep:', rep);
	rep = Hue.objectSort(rep);
	Hue.userFunc(Hue.bridge.ipaddress, rep, null);
};


module.exports = Hue;
//////////////////////////////////////////////////////////////////////
// EOF
//////////////////////////////////////////////////////////////////////
