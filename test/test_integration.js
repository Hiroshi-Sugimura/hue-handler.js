'use strict';

const chai = require('chai');
const sinon = require('sinon');
const Hue = require('../index.js');
const expect = chai.expect;

describe('Hue Handler Integration Tests', function () {
    // Environment variables
    const USER_KEY = process.env.HUE_KEY;

    let sandbox;
    let discoveredIp = null; // Store IP found in auto-discovery for the manual IP test

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

    // Test Case 1: Auto Discovery (Input IP is NOT present)
    it('should connect to the bridge using Auto-Discovery', async function () {
        this.timeout(40000); // Discovery takes time

        console.log('--- Test Case 1: Auto-Discovery (No IP provided) ---');

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
            console.log(`Callback discovered IP: ${ip}`);
        };

        try {
            // Initialize without bridgeIp
            const key = await Hue.initialize(USER_KEY, userFunc, {
                appName: 'IntegrationTest_Auto',
                debugMode: true
            });

            expect(key).to.equal(USER_KEY);
            expect(callbackCalled, 'Callback should be called').to.be.true;
            expect(connectedIp).to.be.a('string');
            expect(response).to.be.an('object');

            // Validate response contains lights (at least keys)
            const keys = Object.keys(response);
            console.log(`Received ${keys.length} lights.`);

            // Save discovered IP for the next test
            discoveredIp = connectedIp;

        } catch (e) {
            console.error('Test Failed:', e);
            throw e;
        }
    });

    // Test Case 2: Manual IP (Input IP IS present)
    it('should connect to the bridge using provided Bridge IP', async function () {
        this.timeout(10000); // Should be faster than discovery

        if (!discoveredIp) {
            console.log('[SKIP] Skipping Manual IP test because Auto-Discovery failed to find an IP.');
            this.skip();
        }

        console.log(`--- Test Case 2: Manual IP (Using IP: ${discoveredIp}) ---`);

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
            console.log(`Callback via Manual IP: ${ip}`);
        };

        try {
            // Initialize WITH bridgeIp
            const key = await Hue.initialize(USER_KEY, userFunc, {
                appName: 'IntegrationTest_Manual',
                debugMode: true,
                bridgeIp: discoveredIp // Use the IP found in previous test
            });

            expect(key).to.equal(USER_KEY);
            expect(callbackCalled, 'Callback should be called').to.be.true;
            expect(connectedIp).to.equal(discoveredIp); // Verify it used the provided IP
            expect(response).to.be.an('object');

        } catch (e) {
            console.error('Test Failed:', e);
            throw e;
        }
    });
});
