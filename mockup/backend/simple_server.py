from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime
import urllib.parse

class DexterMockHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == '/api/issues':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            issues = [
                {
                    "id": "1",
                    "title": "TypeError: Cannot read property 'map' of undefined",
                    "culprit": "app/components/UserList.tsx",
                    "level": "error",
                    "platform": "javascript",
                    "count": 234,
                    "userCount": 45,
                    "firstSeen": "2024-01-15T10:30:00Z",
                    "lastSeen": "2024-01-20T15:45:00Z",
                    "status": "unresolved",
                    "project": {"id": "1", "name": "frontend-app", "slug": "frontend-app"}
                },
                {
                    "id": "2",
                    "title": "DatabaseError: deadlock detected",
                    "culprit": "backend/services/order_service.py",
                    "level": "error",
                    "platform": "python",
                    "count": 89,
                    "userCount": 12,
                    "firstSeen": "2024-01-18T08:15:00Z",
                    "lastSeen": "2024-01-20T14:30:00Z",
                    "status": "unresolved",
                    "project": {"id": "2", "name": "backend-api", "slug": "backend-api"}
                },
                {
                    "id": "3",
                    "title": "N+1 Query detected in ProductList",
                    "culprit": "backend/views/product_views.py",
                    "level": "warning",
                    "platform": "python",
                    "count": 1567,
                    "userCount": 234,
                    "firstSeen": "2024-01-10T12:00:00Z",
                    "lastSeen": "2024-01-20T16:00:00Z",
                    "status": "unresolved",
                    "project": {"id": "2", "name": "backend-api", "slug": "backend-api"}
                }
            ]
            self.wfile.write(json.dumps(issues).encode())
            
        elif parsed_path.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            health = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "services": {
                    "database": "healthy",
                    "cache": "healthy",
                    "ai": "healthy"
                }
            }
            self.wfile.write(json.dumps(health).encode())
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/ai/explain':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_type = data.get("type", "Unknown")
            message = data.get("message", "No message provided")
            
            explanations = {
                "TypeError": f"This TypeError occurs when trying to access a property on an undefined value. The error '{message}' suggests that you're attempting to use the 'map' method on a variable that is undefined. This commonly happens when: 1) Data hasn't loaded yet from an API, 2) The expected array property doesn't exist, or 3) There's a typo in the property name.",
                "DatabaseError": f"A database deadlock occurs when two or more transactions are waiting for each other to release locks. The error '{message}' indicates concurrent transactions are trying to access the same resources in different orders. Consider: 1) Acquiring locks in a consistent order, 2) Using shorter transactions, or 3) Implementing retry logic.",
                "N+1 Query": f"An N+1 query problem occurs when your code executes 1 query to fetch a list of items, then N additional queries to fetch related data for each item. This causes performance issues as the number of items grows. Use eager loading with 'select_related' or 'prefetch_related' in Django, or similar techniques in your ORM."
            }
            
            error_key = next((k for k in explanations.keys() if k in error_type), "Unknown")
            
            response = {
                "explanation": explanations.get(error_key, f"Error analysis for '{message}': This error requires further investigation. Check the stack trace and recent code changes."),
                "model": "mock-llm",
                "confidence": 0.85
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), DexterMockHandler)
    print("Dexter Mock Server running on http://localhost:8000")
    print("Press Ctrl+C to stop")
    server.serve_forever()