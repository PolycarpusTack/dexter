// Debug script to log all API requests
// Run this in the browser console

(function() {
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('Fetch request:', args[0], args[1]);
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('Fetch response:', response.status, response.url);
        return response;
      })
      .catch(error => {
        console.error('Fetch error:', error);
        throw error;
      });
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    console.log('XHR request:', method, url);
    this.addEventListener('load', function() {
      console.log('XHR response:', this.status, this.responseURL);
    });
    this.addEventListener('error', function() {
      console.error('XHR error:', this.statusText);
    });
    return originalOpen.apply(this, [method, url, ...rest]);
  };
})();