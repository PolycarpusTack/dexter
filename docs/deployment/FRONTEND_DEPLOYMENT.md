# Dexter Frontend Deployment Guide

This guide provides detailed instructions for building, deploying, and configuring the Dexter frontend application.

## Table of Contents
- [Local Development](#local-development)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Environment Configuration](#environment-configuration)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites
Before you begin, ensure you have:
- Node.js (v16+)
- npm or yarn
- Git

### Step 1: Clone the repository
```bash
git clone https://github.com/your-org/dexter.git
cd dexter/frontend
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Set up environment variables
Create a `.env.development` file in the frontend directory:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_MODE=development
```

### Step 4: Start development server
```bash
npm run dev
```

This will start the development server at `http://localhost:5173` with hot reloading.

> **What's happening?** This sets up a local development environment that automatically reloads when you make code changes. It's like having a live preview of your app as you build it.

## Build Process

### Creating a Production Build

#### Step 1: Create production environment file
Create a `.env.production` file in the frontend directory:
```
VITE_API_BASE_URL=https://api.your-domain.com
VITE_APP_MODE=production
VITE_SENTRY_DSN=https://your-sentry-dsn
```

#### Step 2: Build the application
```bash
# Standard production build
npm run build

# Optimized production build
npm run build:prod

# Analyze bundle size
npm run build:analyze
```

The build output will be in the `dist/` directory. This contains all the static files needed to serve your application.

### Build Output Structure
After building, you'll have a structure like this:
```
dist/
├── assets/
│   ├── index-abc123.js       # Main JS bundle (hashed)
│   ├── vendor-xyz456.js      # Third-party libraries
│   └── index-def789.css      # Styles
├── images/
│   └── ...                   # Optimized images
├── index.html                # Entry point
└── favicon.ico               # Favicon
```

> **What's happening?** The build process:
> 1. Combines all your code files into optimized bundles
> 2. Minifies code to reduce file size
> 3. Hashes filenames for cache busting
> 4. Optimizes images and other assets
> 5. Creates an `index.html` that ties everything together

## Deployment Options

### Option 1: Static Hosting (Netlify/Vercel)

Netlify and Vercel provide the simplest deployment experience for single-page applications.

#### Netlify Deployment

1. Create a `netlify.toml` file in the root directory:
```toml
[build]
  base = "frontend/"
  publish = "dist/"
  command = "npm run build:prod"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Connect your repository to Netlify:
   - Sign up for Netlify
   - Click "New site from Git"
   - Choose your repository
   - Netlify will detect the configuration automatically

3. Configure environment variables in the Netlify dashboard:
   - Go to Site settings > Build & deploy > Environment
   - Add environment variables (same as in .env.production)

#### Vercel Deployment

1. Create a `vercel.json` file in the root directory:
```json
{
  "buildCommand": "cd frontend && npm run build:prod",
  "outputDirectory": "frontend/dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

2. Connect your repository to Vercel:
   - Sign up for Vercel
   - Import your Git repository
   - Vercel will detect the configuration automatically

> **In plain English**: These platforms take care of all the complex deployment steps for you. They'll automatically build your app whenever you push changes to your repository and deploy it to a global CDN for fast loading.

### Option 2: Docker with Nginx

For deployments in environments where you need more control:

1. Create a `Dockerfile` in the frontend directory:
```dockerfile
# Build stage
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy build files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

2. Create a `nginx.conf` file:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Enable compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Handle Single Page Application routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Build and run the Docker container:
```bash
docker build -t dexter-frontend .
docker run -d -p 80:80 --name dexter-frontend dexter-frontend
```

4. For production, add HTTPS:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Rest of configuration...
}
```

> **What's happening?** This creates a Docker container with Nginx that serves your app's static files. Nginx is configured to compress files for faster loading, set proper cache headers, and handle routing for your single-page app.

### Option 3: AWS S3 + CloudFront

For global scale with AWS:

1. Create an S3 bucket:
```bash
aws s3 mb s3://dexter-frontend
```

2. Configure the bucket for static website hosting:
```bash
aws s3 website s3://dexter-frontend --index-document index.html --error-document index.html
```

3. Set bucket policy for public access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::dexter-frontend/*"
    }
  ]
}
```

4. Upload the build files:
```bash
aws s3 sync dist/ s3://dexter-frontend/ --delete
```

5. Create a CloudFront distribution:
   - Origin: S3 bucket website endpoint
   - Default cache behavior: Redirect HTTP to HTTPS
   - Alternate domain names: your-domain.com
   - SSL Certificate: Custom SSL certificate (from ACM)
   - Default root object: index.html

6. Create a CloudFront function for SPA routing:
```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check if the request is for a file with an extension
    if (uri.includes('.')) {
        return request;
    }
    
    // Otherwise, return the index.html
    request.uri = '/index.html';
    return request;
}
```

7. Update DNS with CloudFront distribution domain.

> **In plain English**: This setup puts your files on Amazon's global content delivery network, making your app load quickly for users anywhere in the world. It handles millions of users and automatically scales during traffic spikes.

## Environment Configuration

### Environment Variables

Vite uses environment variables prefixed with `VITE_` that are accessible in your code.

Common variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://api.your-domain.com` |
| `VITE_APP_MODE` | Application mode | `production` |
| `VITE_SENTRY_DSN` | Sentry error tracking | `https://...@sentry.io/...` |
| `VITE_FEATURES_ANALYTICS` | Enable analytics | `true` |

### Accessing Environment Variables

In your code, you can access these variables using:

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isProduction = import.meta.env.VITE_APP_MODE === 'production';

// Using environment variables in API configuration
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  timeout: isProduction ? 10000 : 30000,
};
```

### Environment-Specific Configuration

Create separate files for different environments:
- `.env.development` - Local development settings
- `.env.staging` - Pre-production/testing settings
- `.env.production` - Production settings

Example `.env.staging`:
```
VITE_API_BASE_URL=https://api-staging.your-domain.com
VITE_APP_MODE=staging
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_FEATURES_ANALYTICS=true
```

Then build for specific environments:
```bash
# Build for staging
npm run build -- --mode staging

# Build for production (default)
npm run build
```

## Performance Optimization

### Code Splitting

Break your application into smaller chunks that load only when needed:

```tsx
// Instead of:
import Dashboard from './pages/Dashboard';

// Use:
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

### Image Optimization

1. Use modern image formats:
```jsx
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="Description" loading="lazy" />
</picture>
```

2. Use responsive images:
```jsx
<img 
  src="image-md.jpg"
  srcSet="image-sm.jpg 480w, image-md.jpg 768w, image-lg.jpg 1200w"
  sizes="(max-width: 600px) 480px, (max-width: 1024px) 768px, 1200px"
  alt="Description"
  loading="lazy"
/>
```

### Web Vitals Optimization

1. **First Contentful Paint (FCP)**
   - Use preconnect for APIs: 
     ```html
     <link rel="preconnect" href="https://api.your-domain.com">
     ```
   - Optimize critical CSS:
     ```html
     <style>
       /* Critical CSS */
     </style>
     ```

2. **Largest Contentful Paint (LCP)**
   - Optimize and preload hero images:
     ```html
     <link rel="preload" href="hero.jpg" as="image">
     ```

3. **Cumulative Layout Shift (CLS)**
   - Set image dimensions:
     ```jsx
     <img src="image.jpg" width="800" height="600" alt="Description" />
     ```
   - Use skeletons while loading:
     ```jsx
     {isLoading ? <Skeleton height="300px" /> : <Content />}
     ```

### Bundle Size Optimization

1. Analyze your bundle:
   ```bash
   npm run build:analyze
   ```

2. Use tree shaking helpers:
   ```tsx
   // Bad (imports entire library)
   import _ from 'lodash';
   
   // Good (imports only what's needed)
   import debounce from 'lodash/debounce';
   ```

3. Use dynamic imports for large libraries:
   ```tsx
   const loadChart = async () => {
     const { Chart } = await import('chart.js');
     // Use Chart...
   };
   ```

> **In plain English**: These optimizations make your app load faster and use less data. Code splitting loads only what's needed when it's needed. Image optimization reduces file sizes while maintaining quality. And bundle optimization keeps your JavaScript files small and efficient.

## Security Considerations

### Content Security Policy (CSP)

Add a Content Security Policy to prevent XSS and other attacks:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; connect-src 'self' https://api.your-domain.com https://*.sentry.io;">
```

For Nginx:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://api.your-domain.com https://*.sentry.io;";
```

### CORS Headers

Ensure your backend has proper CORS headers:

```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Secrets Management

- Never expose sensitive API keys in frontend code
- Use environment variables for public API endpoints only
- Keep secrets on the backend

### Authentication Best Practices

- Store tokens in HttpOnly cookies when possible
- Implement token refresh logic
- Clear tokens on logout
- Use HTTPS for all API calls

## Troubleshooting

### Common Issues

#### Build Fails

**Problem**: Build process fails with errors
**Possible causes**:
- Dependency issues
- TypeScript errors
- Environment variable problems

**Solutions**:
```bash
# Clean dependencies and reinstall
rm -rf node_modules
npm install

# Clear build cache
npm run clean

# Check TypeScript errors
npm run typecheck
```

#### API Connection Issues

**Problem**: Application can't connect to backend API
**Possible causes**:
- Incorrect API URL
- CORS issues
- Network/firewall issues

**Solutions**:
1. Check environment variables:
   ```bash
   cat .env.production | grep VITE_API
   ```

2. Verify API is accessible:
   ```bash
   curl -I https://api.your-domain.com/health
   ```

3. Check for CORS headers in API response:
   ```bash
   curl -I -X OPTIONS https://api.your-domain.com/api/v1/config
   ```

#### Routing Issues

**Problem**: Routes return 404 on page refresh
**Possible causes**:
- Server not configured for SPA routing
- Missing redirect rules

**Solutions**:
1. For Nginx, ensure this configuration:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

2. For Apache, add to .htaccess:
   ```
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```

#### Performance Issues

**Problem**: Application loads slowly
**Possible causes**:
- Large bundle size
- Unoptimized images
- Too many external dependencies

**Solutions**:
1. Analyze bundle:
   ```bash
   npm run build:analyze
   ```

2. Enable compression:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/javascript;
   ```

3. Use production build:
   ```bash
   npm run build:prod
   ```

### Debugging Tools

- Chrome DevTools Network tab
- Lighthouse in Chrome DevTools
- WebPageTest.org
- [bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

---

## Conclusion

This guide covers everything you need to know to build, deploy, and optimize the Dexter frontend. By following these instructions and best practices, you'll create a fast, secure, and reliable user experience.

Remember:
- Use environment variables correctly
- Optimize for performance
- Implement proper security measures
- Test thoroughly before deploying

For additional help or to report issues, please refer to the project documentation or open a GitHub issue.