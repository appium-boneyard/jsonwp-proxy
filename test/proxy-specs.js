// transpile:mocha
/* global describe:true, it:true */

import { JWProxy } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
//import Q from 'q';
import 'mochawait';

let should = chai.should();
chai.use(chaiAsPromised);

function buildReqRes (url, method, body) {
  let req = {originalUrl: url, method, body};
  let res = {};
  res.headers = {};
  res.set = (k, v) => { res[k] = v; };
  res.send = (code, body) => { res.sentCode = code; res.sentBody = body;};
  return [req, res];
}

function mockProxy (opts = {}) {
  opts.mockRequest = true;
  return new JWProxy(opts);
}

describe('proxy', () => {
  it('should override default params', () => {
    let j = mockProxy({server: '127.0.0.2'});
    j.server.should.equal('127.0.0.2');
    j.port.should.equal(4444);
  });
  it('should save session id on session creation', async () => {
    let j = mockProxy();
    let [res, body] = await j.proxy('/session', 'POST', {desiredCapabilities: {}});
    res.statusCode.should.equal(200);
    body.should.eql({status: 0, sessionId: '123', value: {browserName: 'boo'}});
    j.sessionId.should.equal('123');
  });
  it('should save session id on session creation with 303', async () => {
    let j = mockProxy();
    let [res, body] = await j.proxy('/session', 'POST', {desiredCapabilities: {redirect: true}});
    res.statusCode.should.equal(303);
    body.should.eql('http://localhost:4444/wd/hub/session/123');
    j.sessionId.should.equal('123');
  });
  describe('straight proxy', () => {
    it('should successfully proxy straight', async () => {
      let j = mockProxy();
      let [res, body] = await j.proxy('/status', 'GET');
      res.statusCode.should.equal(200);
      body.should.eql({status: 0, value: {foo: 'bar'}});
    });
    it('should pass along request errors', async () => {
      let j = mockProxy({sessionId: '123'});
      j.proxy('/badurl', 'GET').should.eventually.be.rejectedWith("Could not proxy");
    });
    it('should proxy error responses and codes', async () => {
      let j = mockProxy({sessionId: '123'});
      let [res, body] = await j.proxy('/element/bad/text', 'GET');
      res.statusCode.should.equal(500);
      body.should.eql({status: 11, value: {message: 'Invisible element'}});
    });
  });
  describe('command proxy', () => {
    it('should successfully proxy command', async () => {
      let j = mockProxy();
      let res = await j.command('/status', 'GET');
      res.should.eql({foo: 'bar'});
    });
    it('should pass along request errors', async () => {
      let j = mockProxy({sessionId: '123'});
      j.command('/badurl', 'GET').should.eventually.be.rejectedWith("Could not proxy");
    });
    it('should throw when a command fails', async () => {
      let j = mockProxy({sessionId: '123'});
      let e = null;
      try {
        await j.command('/element/bad/text', 'GET');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('Original error: Invisible element');
      e.value.should.eql({message: 'Invisible element'});
      e.status.should.equal(11);
    });
    it('should throw when a command fails with a 200', async () => {
      let j = mockProxy({sessionId: '123'});
      let e = null;
      try {
        await j.command('/element/200/text', 'GET');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('Original error: Invisible element');
      e.value.should.eql({message: 'Invisible element'});
      e.status.should.equal(11);
    });
  });
  describe('req/res proxy', () => {
    it('should successfully proxy via req and send to res', async () => {
      let j = mockProxy();
      let [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      res.headers['Content-type'].should.equal('application/json');
      res.sentCode.should.equal(200);
      res.sentBody.should.eql({status: 0, value: {foo: 'bar'}});
    });
  });
});
