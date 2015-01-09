// transpile:mocha
/* global describe:true, it:true */

import { JWProxy } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
//import Q from 'q';
import 'mochawait';

let should = chai.should();
chai.use(chaiAsPromised);

describe('proxy', () => {
  it('should exist', () => {
    should.exist(JWProxy);
  });
  it('should override default params', () => {
    let j = new JWProxy({server: '127.0.0.2'});
    j.server.should.equal('127.0.0.2');
    j.port.should.equal(4444);
  });
  describe('proxying full urls', () => {
    it('should translate host and port', () => {
      let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
      let j = new JWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/status');
    });
    it('should translate the scheme', () => {
      let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
      let j = new JWProxy({scheme: 'HTTPS'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('https://localhost:4444/wd/hub/status');
    });
    it('should translate the base', () => {
      let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
      let j = new JWProxy({base: ''});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/status');
    });
    it('should translate the session id', () => {
      let incomingUrl = 'http://127.0.0.2:4723/wd/hub/session/foobar/element';
      let j = new JWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
    });
    it('should error when translating session commands without session id', () => {
      let incomingUrl = 'http://127.0.0.2:4723/wd/hub/session/foobar/element';
      let j = new JWProxy();
      (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
    });
  });
  describe('proxying partial urls', () => {
    it('should proxy /status', () => {
      let incomingUrl = '/status';
      let j = new JWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/status');
    });
    it('should proxy /session', () => {
      let incomingUrl = '/session';
      let j = new JWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/session');
    });
    it('should proxy /sessions', () => {
      let incomingUrl = '/sessions';
      let j = new JWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/sessions');
    });
    it('should proxy session commands based off /session', () => {
      let incomingUrl = '/session/foobar/element';
      let j = new JWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
    });
    it('should error session commands based off /session without session id', () => {
      let incomingUrl = '/session/foobar/element';
      let j = new JWProxy();
      (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
    });
    it('should proxy session commands without /session', () => {
      let incomingUrl = '/element';
      let j = new JWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
    });
    it('should error session commands without /session without session id', () => {
      let incomingUrl = '/element';
      let j = new JWProxy();
      (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
    });
  });
});
