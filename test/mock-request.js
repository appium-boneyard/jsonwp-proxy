function resFixture (url, method, json) {
  if (/\/status$/.test(url)) {
    return [200, {status: 0, value: {foo: 'bar'}}];
  }
  if (/\/element\/bad\/text$/.test(url)) {
    return [500, {status: 11, value: {message: 'Invisible element'}}];
  }
  if (/\/session$/.test(url) && method === "POST") {
    if (json.desiredCapabilities && json.desiredCapabilities.redirect) {
      return [303, 'http://localhost:4444/wd/hub/session/123'];
    } else {
      return [200, {status: 0, value: {sessionId: '123'}}];
    }
  }
  throw new Error("Can't handle url " + url);
}

export function request (opts, cb) {
  if (/badurl$/.test(opts.url)) {
    return cb(new Error("noworky"));
  }

  let response = {};
  let error = null;
  let [code, body] = resFixture(opts.url, opts.method, opts.json);
  response.statusCode = code;
  response.headers = {'Content-type': 'application/json'};
  cb(error, response, body);
}
