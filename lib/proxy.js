import _ from 'lodash';

class JWProxy {
  constructor (opts = {}) {
    Object.assign(this, {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: '/wd/hub',
      sessionId: null,
    }, opts);
    this.scheme = this.scheme.toLowerCase();
  }

  endpointRequiresSessionId (endpoint) {
    return !_.contains(["/session", "/sessions", "/status"], endpoint);
  }

  getUrlForProxy (url) {
    let proxyBase = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    console.log(proxyBase);
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
    return proxyBase + rest;
  }

  //async proxy (url) {
  //}

  //async proxyReqRes (req, res) {
  //}
}

export default JWProxy;
