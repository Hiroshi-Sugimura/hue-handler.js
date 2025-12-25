'use strict';

const chai = require('chai');
const sinon = require('sinon');
const Hue = require('../index.js');
const expect = chai.expect;

describe('Hue Handler Integration Tests', function () {
    // Environment variables
    const USER_KEY = process.env.HUE_KEY;
    const BRIDGE_IP = process.env.HUE_BRIDGE_IP;

    let sandbox;

    before(function () {
        if (!USER_KEY) {
            console.log('---------------------------------------------------');
            console.log(' [SKIP] Integration tests skipped.');
            console.log(' Reason: HUE_KEY environment variable is not set.');
            console.log(' Please set HUE_KEY to your Hue Bridge User Key to run integration tests.');
            console.log(' Example: $env:HUE_KEY="your-hue-user-key"');
            console.log('---------------------------------------------------');
            this.skip();
        }
    });

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should connect to the bridge and get state', async function () {
        // Increase timeout for discovery (it can take time)
        this.timeout(40000);

        console.log('Integration Test Config:');
        console.log(`  HUE_KEY: ${USER_KEY ? '****' : 'MISSING'}`);
        console.log(`  BRIDGE_IP: ${BRIDGE_IP || 'Auto-Discovery'}`);

        // Mock searchBridge ONLY if BRIDGE_IP is provided to speed up test
        if (BRIDGE_IP) {
            console.log(`Targeting specific Bridge IP: ${BRIDGE_IP}`);
            sandbox.stub(Hue, 'searchBridge').resolves([{ ipaddress: BRIDGE_IP }]);
        } else {
            console.log('Waiting for Bridge Discovery...');
        }

        let callbackCalled = false;
        let connectedIp = null;
        let response = null;

        const userFunc = (ip, rep, err) => {
            if (err) {
                console.error('Callback Error:', err);
                return;
            }
            callbackCalled = true;
            connectedIp = ip;
            response = rep;
            console.log(`Callback received from IP: ${ip}`);
        };

        try {
            // We expect this to succeed with a valid key
            const key = await Hue.initialize(USER_KEY, userFunc, {
                appName: 'IntegrationTest',
                debugMode: true
            });

            expect(key).to.equal(USER_KEY);
            expect(callbackCalled, 'Callback should be called').to.be.true;

            if (BRIDGE_IP) {
                expect(connectedIp).to.equal(BRIDGE_IP);
            } else {
                expect(connectedIp).to.be.a('string');
            }

            expect(response).to.be.an('object');
            expect(response).to.have.property('lights'); // Basic check for Hue response

        } catch (e) {
            console.error('Test Failed:', e);
            throw e;
        }
    });
});

