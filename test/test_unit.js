'use strict';

const chai = require('chai');
const sinon = require('sinon');
const Hue = require('../index.js');
const expect = chai.expect;

describe('Hue Handler Unit Tests', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.createSandbox();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('objectSort', function() {
        it('should sort object keys alphabetically', function() {
            const input = { c: 3, a: 1, b: 2 };
            const expected = { a: 1, b: 2, c: 3 };
            const result = Hue.objectSort(input);
            
            // Check keys order
            const keys = Object.keys(result);
            expect(keys).to.deep.equal(['a', 'b', 'c']);
            expect(result).to.deep.equal(expected);
        });

        it('should handle empty objects', function() {
            const result = Hue.objectSort({});
            expect(result).to.deep.equal({});
        });
    });

    describe('initialize', function() {
        it('should return existing userKey if already initializing', async function() {
            Hue.gonnaInitialize = true;
            Hue.userKey = 'existingUser';
            
            const result = await Hue.initialize('newUser', () => {});
            
            expect(result).to.equal('existingUser');
            // reset for other tests
            Hue.gonnaInitialize = false;
        });

        // Note: More complex tests for initialize would require mocking external dependencies
        // like v3.discovery.upnpSearch or axios, which are internal to index.js.
        // We test basic logic here.
    });
});
