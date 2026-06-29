// Minimal method+path router with `:param` support. No external deps.

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp(
      '^' +
        pattern
          .replace(/\/+$/, '')
          .replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '.*' : '\\' + c))
          .replace(/:([A-Za-z_]+)/g, (_, k) => {
            keys.push(k);
            return '([^/]+)';
          }) +
        '/?$'
    );
    this.routes.push({ method, re, keys, handler, auth: opts.auth !== false });
    return this;
  }

  get(p, h, o) { return this.add('GET', p, h, o); }
  post(p, h, o) { return this.add('POST', p, h, o); }
  patch(p, h, o) { return this.add('PATCH', p, h, o); }
  del(p, h, o) { return this.add('DELETE', p, h, o); }

  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (!m) continue;
      const params = {};
      // Decode defensively: a malformed %-escape (e.g. "%ff") makes
      // decodeURIComponent throw URIError. Fall back to the raw segment so a
      // bad URL becomes a clean 404 instead of crashing the request.
      r.keys.forEach((k, i) => {
        const raw = m[i + 1];
        try { params[k] = decodeURIComponent(raw); }
        catch { params[k] = raw; }
      });
      return { route: r, params };
    }
    return null;
  }
}
