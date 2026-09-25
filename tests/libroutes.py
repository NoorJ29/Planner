# Serves the editor, PDF and Word libraries from tests/libs instead of the internet.
import os
_LIBS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "libs", "node_modules")
_cache = {}
def _read(path):
    if path not in _cache:
        _cache[path] = open(os.path.join(_LIBS, path), encoding="utf8").read()
    return _cache[path]
def serve_libs(target):
    """Route CDN requests on a page or context to the local copies."""
    def jsdelivr(route):
        url = route.request.url
        if url.endswith("quill.core.css"):
            route.fulfill(body=_read("quill/dist/quill.core.css"), content_type="text/css")
        elif url.endswith("quill.js"):
            route.fulfill(body=_read("quill/dist/quill.js"), content_type="application/javascript")
        else:
            route.abort()
    def cdnjs(route):
        name = "jspdf/dist/jspdf.umd.min.js" if "jspdf" in route.request.url else "jszip/dist/jszip.min.js"
        route.fulfill(body=_read(name), content_type="application/javascript")
    target.route("**/cdn.jsdelivr.net/**", jsdelivr)
    target.route("**/cdnjs.cloudflare.com/**", cdnjs)
