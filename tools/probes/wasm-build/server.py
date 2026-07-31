import functools
import http.server
import socketserver

PORT = 8765

http.server.SimpleHTTPRequestHandler.extensions_map['.wasm'] = 'application/wasm'
http.server.SimpleHTTPRequestHandler.extensions_map['.js'] = 'text/javascript'


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


handler = functools.partial(Handler, directory='.')
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler) as httpd:
    print(f'serving on http://127.0.0.1:{PORT}')
    httpd.serve_forever()
