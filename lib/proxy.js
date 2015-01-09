import _ from 'lodash';
import { request as mockRequest } from '../test/mock-request';
import realRequest from 'request';
import jwpStatus from 'jsonwp-status';
import Q from 'q';

class JWProxy {
  constructor (opts = {}) {
    Object.assign(this, {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: '/wd/hub',
      sessionId: null,
      mockRequest: false
    }, opts);
    this.scheme = this.scheme.toLowerCase();
  }

  request (...args) {
    if (this.mockRequest) {
      return mockRequest(...args);
    } else {
      return realRequest(...args);
    }
  }

  endpointRequiresSessionId (endpoint) {
    return !_.contains(["/session", "/sessions", "/status"], endpoint);
  }

  getUrlForProxy (url) {
    if (url === "") url = "/";
    let proxyBase = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    let endpointRe = '(/(session|status))';
    let rest = "";
    if (/^http/.test(url)) {
      let first = (new RegExp('(https?://.+)' + endpointRe)).exec(url);
      if (!first) {
        throw new Error("Got a complete url but could not extract JWP endpoint");
      }
      rest = url.replace(first[1], '');
    } else if ((new RegExp('^/')).test(url)) {
      rest = url;
    } else {
      throw new Error("Didn't know what to do with url '" + url + "'");
    }
    let requiresSessionId = this.endpointRequiresSessionId(rest);

    if (requiresSessionId && this.sessionId === null) {
      throw new Error("Trying to proxy a session command without session id");
    }

    if (!(new RegExp(endpointRe)).test(rest)) {
      rest = `/session/${this.sessionId}${rest}`;
    }

    let sessionBaseRe = new RegExp('^/session/([^/]+)');
    if (sessionBaseRe.test(rest)) {
      // we have something like /session/:id/foobar, so we need to replace
      // the session id
      let match = sessionBaseRe.exec(rest);
      rest = rest.replace(match[1], this.sessionId);
    } else if (requiresSessionId) {
      throw new Error("Got bad session base with rest of url: " + rest);
    }
    rest = rest.replace(/\/$/, ''); // can't have trailing slashes
    return proxyBase + rest;
  }

  async proxy (url, method, body = null) {
    method = method.toUpperCase();
    let reqOpts = {
      url: this.getUrlForProxy(url),
      method,
      headers: {'Content-type': 'application/json;charset=UTF=8'}
    };
    if (body !== null) {
      if (typeof body !== 'object') {
        body = JSON.parse(body);
      }
      reqOpts.json = body;
    }
    let res, resBody;
    try {
      [res, resBody] = await Q.ninvoke(this, 'request', reqOpts);
      if (/\/session$/.test(url) && method === "POST") {
        if (res.statusCode === 200) {
          this.sessionId = resBody.sessionId;
        } else if (res.statusCode === 303) {
          this.sessionId = /\/session\/([^\/]+)/.exec(resBody)[1];
        }
      }
    } catch (e) {
      throw new Error("Could not proxy command to remote server. " +
                      `Original error: ${e.message}`);
    }
    return [res, resBody];
  }

  async command (url, method, body = null) {
    let [response, resBody] = await this.proxy(url, method, body);
    if (typeof resBody === "string") {
      try {
        resBody = JSON.parse(resBody);
      } catch (e) {}
    }
    let statusCodesWithRes = [200, 500];
    if (_.contains(statusCodesWithRes, response.statusCode) &&
        (_.isUndefined(resBody.status) || _.isUndefined(resBody.value))) {
      throw new Error("Did not get a valid response object. Object was: " +
                      JSON.stringify(resBody));
    }
    if (_.contains([500, 200], response.statusCode)) {
      if (response.statusCode === 200 && resBody.status === 0) {
        return resBody.value;
      } else if (response.statusCode === 200) {
        return resBody;
      }
      let message = jwpStatus.getSummaryByCode(resBody.status);
      if (resBody.value.message) {
        message += ` (Original error: ${resBody.value.message})`;
      }
      let e = new Error(message);
      e.status = resBody.status;
      e.value = resBody.value;
      throw e;
    }
    throw new Error(`Didn't know what to do with response code ${response.statusCode}`);
  }

  async proxyReqRes (req, res) {
    let [response, body] = await this.proxy(req.originalUrl, req.method, req.body);
    res.headers = response.headers;
    res.set('Content-type', response.headers['content-type']);
    res.send(response.statusCode, body);
  }
}

export default JWProxy;
