# Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2025-09-08  
**Classification:** Production Deployment Guide  

---

## Overview

This comprehensive deployment guide covers all aspects of deploying the HFT Trading Platform Frontend to production environments. The guide includes local development setup, staging deployment, production deployment, monitoring configuration, and operational procedures.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HFT Platform Deployment                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    Production Environment                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │     CDN     │  │  Load Bal.  │  │   App Pods  │  │   Cache    │ │ │
│  │  │ (CloudFlare)│  │ (NGINX)     │  │ (K8s Pods)  │  │  (Redis)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     Staging Environment                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │   Git Hub   │  │   CI/CD     │  │   Testing   │  │ Monitoring │ │ │
│  │  │   Actions   │  │ Pipeline    │  │   Suite     │  │ (Grafana)  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                  Development Environment                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │  Local Dev  │  │  Hot Reload │  │   Debug     │  │    Docs    │ │ │
│  │  │   Server    │  │    (HMR)    │  │   Tools     │  │  (Storybook)│ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

**Development Environment:**
- Node.js >= 18.17.0
- npm >= 9.0.0 or yarn >= 3.0.0
- Git >= 2.30.0
- Docker >= 20.10.0 (optional)
- Memory: 8GB+ recommended
- Storage: 10GB+ free space

**Production Environment:**
- Kubernetes cluster >= 1.25.0
- Docker Registry (ECR, Harbor, etc.)
- Load Balancer (NGINX, ALB, etc.)
- CDN (CloudFlare, CloudFront, etc.)
- SSL certificates
- Domain name and DNS access

### Required Accounts & Services

- **GitHub/GitLab:** Source code repository
- **Docker Registry:** Container image storage
- **Cloud Provider:** AWS/GCP/Azure (or on-premises)
- **Monitoring:** Datadog/New Relic/Grafana Cloud
- **Error Tracking:** Sentry
- **CDN Provider:** CloudFlare/AWS CloudFront

---

## Local Development Setup

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/hft-trading-platform.git
cd hft-trading-platform/hft-trading-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Configuration

Create `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8081/ws
NEXT_PUBLIC_CPP_BACKEND_URL=http://localhost:8080/api

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_SIGNING_PRIVATE_KEY=your-rsa-private-key

# Feature Flags
NEXT_PUBLIC_ENABLE_PAPER_TRADING=true
NEXT_PUBLIC_ENABLE_OPTIONS_TRADING=true
NEXT_PUBLIC_ENABLE_ALGO_TRADING=true
NEXT_PUBLIC_ENABLE_DEBUG_PANEL=true

# Development Tools
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_HOTJAR=false
ANALYZE=false

# WebSocket Configuration
NEXT_PUBLIC_WS_RECONNECT_INTERVAL=1000
NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS=10
NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL=30000

# Performance
NEXT_PUBLIC_ENABLE_SW=false
NEXT_PUBLIC_BUNDLE_ANALYZE=false

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
```

### Development Scripts

```bash
# Core development commands
npm run dev              # Start development server
npm run dev:debug        # Start with Node.js debugging
npm run dev:turbo        # Start with Turbopack (experimental)
npm run dev:https        # Start with HTTPS (requires certificates)

# Building and testing
npm run build            # Production build
npm run start            # Start production server
npm run export           # Export static files
npm run analyze          # Bundle size analysis

# Code quality
npm run lint             # ESLint checking
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # TypeScript type checking
npm run format           # Format with Prettier

# Testing
npm run test             # Run Jest unit tests
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Cypress E2E tests
npm run test:load        # Load testing with k6

# Documentation
npm run storybook        # Start Storybook
npm run docs:build       # Build documentation
npm run docs:serve       # Serve documentation
```

### Docker Development

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
    stdin_open: true
    tty: true

  websocket-server:
    image: node:18-alpine
    working_dir: /app
    ports:
      - "8081:8081"
    volumes:
      - ./hft_websocket_mock_server.js:/app/server.js
    command: ["node", "server.js"]

  cpp-backend:
    image: hft-cpp-backend:latest
    ports:
      - "8080:8080"
    environment:
      - LOG_LEVEL=debug
```

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

---

## Staging Environment

### GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/staging-deploy.yml
name: Deploy to Staging

on:
  push:
    branches: [staging, develop]
    paths: ['hft-trading-frontend/**']
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/frontend

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: 'hft-trading-frontend/package-lock.json'
        
    - name: Install dependencies
      working-directory: hft-trading-frontend
      run: npm ci
      
    - name: Type checking
      working-directory: hft-trading-frontend
      run: npm run type-check
      
    - name: Linting
      working-directory: hft-trading-frontend
      run: npm run lint
      
    - name: Unit tests
      working-directory: hft-trading-frontend
      run: npm run test -- --coverage --watchAll=false
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: hft-trading-frontend/coverage/lcov.info

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        
    - name: Install dependencies
      working-directory: hft-trading-frontend
      run: npm ci
      
    - name: Security audit
      working-directory: hft-trading-frontend
      run: npm audit --audit-level moderate
      
    - name: License check
      working-directory: hft-trading-frontend
      run: npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD;ISC;CC0-1.0'

  build:
    name: Build and Push Image
    runs-on: ubuntu-latest
    needs: [test, security]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./hft-trading-frontend
        file: ./hft-trading-frontend/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        build-args: |
          NEXT_PUBLIC_BUILD_TIME=${{ github.run_id }}
          NEXT_PUBLIC_GIT_SHA=${{ github.sha }}

  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    
    environment:
      name: staging
      url: https://staging.hft-platform.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}
        
    - name: Deploy to staging
      run: |
        cd k8s/staging
        
        # Replace image tag
        sed -i "s|{{IMAGE_TAG}}|${{ github.sha }}|g" deployment.yaml
        
        # Apply configurations
        kubectl apply -f namespace.yaml
        kubectl apply -f configmap.yaml
        kubectl apply -f secrets.yaml
        kubectl apply -f deployment.yaml
        kubectl apply -f service.yaml
        kubectl apply -f ingress.yaml
        
        # Wait for rollout
        kubectl rollout status deployment/hft-frontend -n staging --timeout=300s
        
    - name: Run smoke tests
      run: |
        # Wait for deployment to be ready
        sleep 30
        
        # Basic health check
        curl -f https://staging.hft-platform.com/api/health || exit 1
        
        # WebSocket connectivity test
        node scripts/test-websocket.js wss://staging.hft-platform.com/ws || exit 1

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: deploy
    if: github.ref == 'refs/heads/staging'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        
    - name: Install dependencies
      working-directory: hft-trading-frontend
      run: npm ci
      
    - name: Run Cypress E2E tests
      uses: cypress-io/github-action@v6
      with:
        working-directory: hft-trading-frontend
        browser: chrome
        record: true
        parallel: true
      env:
        CYPRESS_BASE_URL: https://staging.hft-platform.com
        CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: deploy
    if: github.ref == 'refs/heads/staging'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup k6
      uses: grafana/setup-k6-action@v1
      
    - name: Run load tests
      run: |
        k6 run scripts/load-test.js \
          --env BASE_URL=https://staging.hft-platform.com \
          --env WS_URL=wss://staging.hft-platform.com/ws \
          --out json=results.json
          
    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: results.json
```

### Staging Kubernetes Configuration

```yaml
# k8s/staging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    name: staging
    environment: staging
```

```yaml
# k8s/staging/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: staging
data:
  NEXT_PUBLIC_API_BASE_URL: "https://api-staging.hft-platform.com/api"
  NEXT_PUBLIC_WEBSOCKET_URL: "wss://ws-staging.hft-platform.com/ws"
  NEXT_PUBLIC_CPP_BACKEND_URL: "https://engine-staging.hft-platform.com/api"
  NEXT_PUBLIC_ENABLE_ANALYTICS: "true"
  NEXT_PUBLIC_ENABLE_DEBUG_PANEL: "false"
  NODE_ENV: "production"
  NEXT_TELEMETRY_DISABLED: "1"
```

```yaml
# k8s/staging/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: frontend-secrets
  namespace: staging
type: Opaque
data:
  NEXTAUTH_SECRET: <base64-encoded-secret>
  JWT_SIGNING_PRIVATE_KEY: <base64-encoded-private-key>
  SENTRY_DSN: <base64-encoded-dsn>
```

```yaml
# k8s/staging/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hft-frontend
  namespace: staging
  labels:
    app: hft-frontend
    environment: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hft-frontend
  template:
    metadata:
      labels:
        app: hft-frontend
    spec:
      containers:
      - name: frontend
        image: ghcr.io/your-org/hft-trading-platform/frontend:{{IMAGE_TAG}}
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: frontend-config
        - secretRef:
            name: frontend-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
```

---

## Production Environment

### Production Dockerfile

```dockerfile
# Dockerfile
# Multi-stage build for optimal production image
FROM node:18-alpine AS dependencies

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build arguments for build-time configuration
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_CPP_BACKEND_URL
ARG NEXT_PUBLIC_BUILD_TIME
ARG NEXT_PUBLIC_GIT_SHA

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security hardening
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Production Kubernetes Deployment

```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hft-frontend
  namespace: production
  labels:
    app: hft-frontend
    environment: production
    version: v1.0.0
spec:
  replicas: 6  # High availability
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: hft-frontend
  template:
    metadata:
      labels:
        app: hft-frontend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      # Pod Anti-Affinity for high availability
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - hft-frontend
              topologyKey: kubernetes.io/hostname
      
      containers:
      - name: frontend
        image: ghcr.io/your-org/hft-trading-platform/frontend:v1.0.0
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        envFrom:
        - configMapRef:
            name: frontend-config
        - secretRef:
            name: frontend-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
            ephemeral-storage: "1Gi"
          limits:
            memory: "2Gi"
            cpu: "2000m"
            ephemeral-storage: "2Gi"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
            httpHeaders:
            - name: Host
              value: localhost
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
          successThreshold: 1
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
            httpHeaders:
            - name: Host
              value: localhost
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
          successThreshold: 1
        
        startupProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        
        # Security context
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
        
        # Volume mounts for read-only filesystem
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: nextjs-cache
          mountPath: /.next
      
      volumes:
      - name: tmp-volume
        emptyDir: {}
      - name: nextjs-cache
        emptyDir: {}
      
      # Security
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      
      # DNS configuration for faster lookups
      dnsConfig:
        options:
        - name: ndots
          value: "2"
        - name: edns0
```

### Production Service Configuration

```yaml
# k8s/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hft-frontend-service
  namespace: production
  labels:
    app: hft-frontend
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
spec:
  type: LoadBalancer
  selector:
    app: hft-frontend
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  sessionAffinity: None
```

### Production Ingress with SSL

```yaml
# k8s/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hft-frontend-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    
    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; font-src 'self' data:;";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
spec:
  tls:
  - hosts:
    - hft-platform.com
    - www.hft-platform.com
    secretName: hft-platform-tls
  rules:
  - host: hft-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hft-frontend-service
            port:
              number: 80
  - host: www.hft-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hft-frontend-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hft-frontend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hft-frontend
  minReplicas: 6
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

---

## CDN Configuration

### CloudFlare Configuration

```yaml
# terraform/cloudflare.tf
resource "cloudflare_zone" "hft_platform" {
  zone = "hft-platform.com"
}

resource "cloudflare_zone_settings_override" "hft_platform" {
  zone_id = cloudflare_zone.hft_platform.id
  settings {
    ssl = "full"
    always_use_https = "on"
    min_tls_version = "1.2"
    opportunistic_encryption = "on"
    tls_1_3 = "zrt"
    automatic_https_rewrites = "on"
    security_level = "medium"
    browser_check = "on"
    challenge_ttl = 1800
    development_mode = "off"
    origin_error_page_pass_thru = "off"
    sort_query_string_for_cache = "off"
    always_online = "off"
    minify {
      css = "on"
      js = "on"
      html = "on"
    }
    brotli = "on"
    websockets = "on"
  }
}

# Page Rules for optimization
resource "cloudflare_page_rule" "cache_static_assets" {
  zone_id  = cloudflare_zone.hft_platform.id
  target   = "hft-platform.com/_next/static/*"
  priority = 1
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 31536000  # 1 year
    browser_cache_ttl = 31536000
  }
}

resource "cloudflare_page_rule" "api_no_cache" {
  zone_id  = cloudflare_zone.hft_platform.id
  target   = "hft-platform.com/api/*"
  priority = 2
  
  actions {
    cache_level = "bypass"
  }
}

# Rate limiting for API endpoints
resource "cloudflare_rate_limit" "api_rate_limit" {
  zone_id = cloudflare_zone.hft_platform.id
  threshold = 1000
  period = 60
  match {
    request {
      url_pattern = "*/api/*"
      schemes = ["HTTPS"]
      methods = ["GET", "POST", "PUT", "DELETE"]
    }
  }
  action {
    mode = "simulate"  # Change to "ban" in production
    timeout = 60
  }
}
```

### NGINX Configuration (Origin Server)

```nginx
# nginx.conf
upstream frontend_backend {
    least_conn;
    server hft-frontend-service:80 max_fails=3 fail_timeout=30s;
    server hft-frontend-service:80 max_fails=3 fail_timeout=30s backup;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=1000r/m;

server {
    listen 80;
    listen [::]:80;
    server_name hft-platform.com www.hft-platform.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hft-platform.com www.hft-platform.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/hft-platform.com.crt;
    ssl_certificate_key /etc/ssl/private/hft-platform.com.key;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static asset caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://frontend_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket endpoint
    location /ws {
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
    
    # Main application
    location / {
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://frontend_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Caching for HTML pages
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        proxy_cache_min_uses 3;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://frontend_backend/api/health;
        proxy_set_header Host $host;
    }
}
```

---

## Monitoring and Observability

### Prometheus Configuration

```yaml
# k8s/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hft-frontend-metrics
  namespace: production
  labels:
    app: hft-frontend
spec:
  selector:
    matchLabels:
      app: hft-frontend
  endpoints:
  - port: http
    interval: 15s
    path: /metrics
    honorLabels: true
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "HFT Frontend Monitoring",
    "tags": ["hft", "frontend", "trading"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"hft-frontend\"}[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"hft-frontend\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"hft-frontend\"}[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "WebSocket Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "websocket_connections_active{job=\"hft-frontend\"}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"hft-frontend\",status=~\"4..|5..\"}[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  }
}
```

### Alerting Rules

```yaml
# k8s/monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hft-frontend-alerts
  namespace: production
spec:
  groups:
  - name: hft-frontend.rules
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{job="hft-frontend",status=~"5.."}[5m]) > 0.1
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on HFT Frontend"
        description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
        
    - alert: HighResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="hft-frontend"}[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time on HFT Frontend"
        description: "95th percentile response time is {{ $value }}s"
        
    - alert: WebSocketConnectionDrop
      expr: decrease(websocket_connections_active{job="hft-frontend"}[5m]) > 100
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Large drop in WebSocket connections"
        description: "WebSocket connections dropped by {{ $value }} in 5 minutes"
        
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total{container="frontend"}[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"
        description: "Pod has restarted {{ $value }} times in the last 15 minutes"
        
    - alert: HighMemoryUsage
      expr: container_memory_usage_bytes{container="frontend"} / container_spec_memory_limit_bytes{container="frontend"} > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on pod {{ $labels.pod }}"
        description: "Memory usage is {{ $value | humanizePercentage }}"
```

---

## Security Configuration

### Network Policies

```yaml
# k8s/security/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hft-frontend-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: hft-frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 3000
  egress:
  # Allow DNS resolution
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow HTTPS outbound
  - to: []
    ports:
    - protocol: TCP
      port: 443
  # Allow API backend
  - to:
    - namespaceSelector:
        matchLabels:
          name: api-backend
    ports:
    - protocol: TCP
      port: 8080
```

### Pod Security Policy

```yaml
# k8s/security/podsecuritypolicy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: hft-frontend-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  runAsGroup:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

### RBAC Configuration

```yaml
# k8s/security/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hft-frontend-sa
  namespace: production

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hft-frontend-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: hft-frontend-rolebinding
  namespace: production
subjects:
- kind: ServiceAccount
  name: hft-frontend-sa
  namespace: production
roleRef:
  kind: Role
  name: hft-frontend-role
  apiGroup: rbac.authorization.k8s.io
```

---

## Backup and Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/hft-frontend"
S3_BUCKET="hft-platform-backups"

echo "Starting backup process at $(date)"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_DATE}"

# Backup Kubernetes configurations
echo "Backing up Kubernetes configurations..."
kubectl get all,configmaps,secrets,ingress,pv,pvc -n production -o yaml > \
  "${BACKUP_DIR}/${BACKUP_DATE}/k8s-production.yaml"

# Backup application configurations
echo "Backing up application configurations..."
cp -r k8s/ "${BACKUP_DIR}/${BACKUP_DATE}/k8s-configs"

# Backup monitoring configurations
echo "Backing up monitoring configurations..."
kubectl get prometheusrules,servicemonitors,alertmanagers -A -o yaml > \
  "${BACKUP_DIR}/${BACKUP_DATE}/monitoring.yaml"

# Create archive
echo "Creating archive..."
cd "${BACKUP_DIR}"
tar -czf "hft-frontend-backup-${BACKUP_DATE}.tar.gz" "${BACKUP_DATE}/"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "hft-frontend-backup-${BACKUP_DATE}.tar.gz" \
  "s3://${S3_BUCKET}/frontend/hft-frontend-backup-${BACKUP_DATE}.tar.gz"

# Cleanup local backup (keep last 7 days)
find "${BACKUP_DIR}" -name "hft-frontend-backup-*.tar.gz" -mtime +7 -delete
find "${BACKUP_DIR}" -name "20*" -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed successfully at $(date)"
```

### Disaster Recovery Procedures

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -euo pipefail

RECOVERY_DATE="${1:-latest}"
S3_BUCKET="hft-platform-backups"
RESTORE_DIR="/tmp/hft-restore"

echo "Starting disaster recovery process for ${RECOVERY_DATE}"

# Download backup from S3
if [ "${RECOVERY_DATE}" = "latest" ]; then
    BACKUP_FILE=$(aws s3 ls "s3://${S3_BUCKET}/frontend/" | sort | tail -n 1 | awk '{print $4}')
else
    BACKUP_FILE="hft-frontend-backup-${RECOVERY_DATE}.tar.gz"
fi

echo "Downloading backup: ${BACKUP_FILE}"
aws s3 cp "s3://${S3_BUCKET}/frontend/${BACKUP_FILE}" "/tmp/${BACKUP_FILE}"

# Extract backup
mkdir -p "${RESTORE_DIR}"
cd "${RESTORE_DIR}"
tar -xzf "/tmp/${BACKUP_FILE}"

# Get the backup directory name
BACKUP_FOLDER=$(find . -name "20*" -type d | head -n 1)

echo "Restoring from backup: ${BACKUP_FOLDER}"

# Create namespace if it doesn't exist
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

# Restore secrets first
echo "Restoring secrets..."
kubectl apply -f "${BACKUP_FOLDER}/k8s-configs/production/secrets.yaml"

# Restore configmaps
echo "Restoring configmaps..."
kubectl apply -f "${BACKUP_FOLDER}/k8s-configs/production/configmap.yaml"

# Restore deployment
echo "Restoring deployment..."
kubectl apply -f "${BACKUP_FOLDER}/k8s-configs/production/deployment.yaml"

# Restore services and ingress
echo "Restoring services and ingress..."
kubectl apply -f "${BACKUP_FOLDER}/k8s-configs/production/service.yaml"
kubectl apply -f "${BACKUP_FOLDER}/k8s-configs/production/ingress.yaml"

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/hft-frontend -n production --timeout=600s

# Verify deployment
echo "Verifying deployment..."
kubectl get pods -n production -l app=hft-frontend

# Test application health
echo "Testing application health..."
sleep 30
kubectl port-forward svc/hft-frontend-service 8080:80 -n production &
PORT_FORWARD_PID=$!
sleep 5

if curl -f http://localhost:8080/api/health; then
    echo "Disaster recovery completed successfully!"
else
    echo "Health check failed after recovery"
    exit 1
fi

# Cleanup
kill $PORT_FORWARD_PID 2>/dev/null || true
rm -rf "${RESTORE_DIR}"
rm -f "/tmp/${BACKUP_FILE}"

echo "Recovery process completed at $(date)"
```

---

## Operational Procedures

### Deployment Checklist

**Pre-Deployment:**
- [ ] Code review completed and approved
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Backup taken of current production
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

**Deployment:**
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production using blue-green strategy
- [ ] Monitor deployment progress
- [ ] Verify health checks passing
- [ ] Run post-deployment tests
- [ ] Monitor application metrics
- [ ] Verify WebSocket connectivity
- [ ] Check error rates and response times

**Post-Deployment:**
- [ ] Monitor for 30 minutes minimum
- [ ] Verify all features working correctly
- [ ] Check logs for any errors
- [ ] Update runbooks if necessary
- [ ] Notify stakeholders of successful deployment
- [ ] Document any issues encountered

### Rollback Procedures

```bash
#!/bin/bash
# scripts/rollback.sh

set -euo pipefail

PREVIOUS_VERSION="${1}"
NAMESPACE="production"

if [ -z "${PREVIOUS_VERSION}" ]; then
    echo "Usage: $0 <previous_version>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

echo "Initiating rollback to version: ${PREVIOUS_VERSION}"

# Confirm rollback
read -p "Are you sure you want to rollback to ${PREVIOUS_VERSION}? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 1
fi

# Update deployment with previous image
echo "Rolling back deployment..."
kubectl set image deployment/hft-frontend \
    frontend="ghcr.io/your-org/hft-trading-platform/frontend:${PREVIOUS_VERSION}" \
    -n "${NAMESPACE}"

# Wait for rollout
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/hft-frontend -n "${NAMESPACE}" --timeout=300s

# Verify rollback
echo "Verifying rollback..."
kubectl get pods -n "${NAMESPACE}" -l app=hft-frontend

# Test application health
echo "🏥 Testing application health..."
kubectl port-forward svc/hft-frontend-service 8080:80 -n "${NAMESPACE}" &
PORT_FORWARD_PID=$!
sleep 10

if curl -f http://localhost:8080/api/health; then
    echo "Rollback completed successfully!"
    echo "Current deployment status:"
    kubectl get deployment hft-frontend -n "${NAMESPACE}" -o wide
else
    echo "Health check failed after rollback"
    echo "🔍 Check pod logs:"
    kubectl logs -l app=hft-frontend -n "${NAMESPACE}" --tail=50
    exit 1
fi

# Cleanup
kill $PORT_FORWARD_PID 2>/dev/null || true

echo "Rollback to ${PREVIOUS_VERSION} completed successfully!"
```

### Scaling Procedures

```bash
#!/bin/bash
# scripts/scale.sh

set -euo pipefail

ACTION="${1}"
REPLICAS="${2:-}"
NAMESPACE="production"

case "${ACTION}" in
    up)
        if [ -z "${REPLICAS}" ]; then
            echo "Usage: $0 up <replica_count>"
            exit 1
        fi
        echo "Scaling up to ${REPLICAS} replicas..."
        kubectl scale deployment hft-frontend --replicas="${REPLICAS}" -n "${NAMESPACE}"
        ;;
    down)
        if [ -z "${REPLICAS}" ]; then
            echo "Usage: $0 down <replica_count>"
            exit 1
        fi
        echo "📉 Scaling down to ${REPLICAS} replicas..."
        kubectl scale deployment hft-frontend --replicas="${REPLICAS}" -n "${NAMESPACE}"
        ;;
    auto)
        echo "🤖 Enabling auto-scaling..."
        kubectl apply -f k8s/production/hpa.yaml
        ;;
    status)
        echo "Current scaling status:"
        kubectl get deployment hft-frontend -n "${NAMESPACE}" -o wide
        kubectl get hpa hft-frontend-hpa -n "${NAMESPACE}" 2>/dev/null || echo "HPA not configured"
        ;;
    *)
        echo "Usage: $0 {up|down|auto|status} [replica_count]"
        exit 1
        ;;
esac

if [ "${ACTION}" != "status" ]; then
    echo "⏳ Waiting for scaling operation to complete..."
    kubectl rollout status deployment/hft-frontend -n "${NAMESPACE}" --timeout=300s
    
    echo "Scaling operation completed!"
    kubectl get pods -n "${NAMESPACE}" -l app=hft-frontend
fi
```

---

## Troubleshooting Guide

### Common Issues

#### Pod Startup Failures

```bash
# Check pod status
kubectl get pods -n production -l app=hft-frontend

# Describe failed pods
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production --previous

# Common causes and solutions:
# 1. Image pull errors - check registry credentials
# 2. Resource limits - increase memory/CPU limits
# 3. Configuration errors - verify ConfigMaps and Secrets
# 4. Health check failures - check probe configuration
```

#### High Memory Usage

```bash
# Check memory usage
kubectl top pods -n production -l app=hft-frontend

# Get detailed resource usage
kubectl describe pod <pod-name> -n production

# Solutions:
# 1. Increase memory limits in deployment
# 2. Check for memory leaks in application
# 3. Optimize Docker image size
# 4. Enable Node.js memory profiling
```

#### WebSocket Connection Issues

```bash
# Test WebSocket connectivity
node scripts/test-websocket.js wss://hft-platform.com/ws

# Check ingress configuration
kubectl describe ingress hft-frontend-ingress -n production

# Verify WebSocket headers in NGINX
kubectl logs -l app=nginx-ingress-controller -n ingress-nginx

# Common solutions:
# 1. Update NGINX configuration for WebSocket support
# 2. Check firewall rules for WebSocket traffic
# 3. Verify SSL certificate covers WebSocket endpoint
```

### Performance Issues

```bash
# Check application performance metrics
curl -s http://hft-platform.com/metrics | grep -E "(http_request_duration|http_requests_total)"

# Monitor pod resource usage
kubectl top pods -n production -l app=hft-frontend --containers

# Check HPA status
kubectl describe hpa hft-frontend-hpa -n production

# Solutions:
# 1. Increase pod replicas for higher load
# 2. Optimize application code (React components, API calls)
# 3. Enable caching (Redis, CDN)
# 4. Optimize database queries
```

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate hft-platform-tls -n production

# Check cert-manager logs
kubectl logs -l app=cert-manager -n cert-manager

# Verify certificate expiry
echo | openssl s_client -servername hft-platform.com -connect hft-platform.com:443 2>/dev/null | openssl x509 -noout -dates

# Solutions:
# 1. Verify cert-manager cluster issuer configuration
# 2. Check DNS propagation for domain validation
# 3. Renew certificates manually if auto-renewal fails
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily:**
- Monitor application health and metrics
- Check error rates and response times
- Review security alerts and logs
- Verify backup completion

**Weekly:**
- Update dependencies (security patches)
- Review and clean old Docker images
- Check certificate expiration dates
- Analyze performance trends

**Monthly:**
- Full security audit
- Dependency vulnerability scan
- Performance benchmark comparison
- Documentation updates
- Disaster recovery test

### Security Updates

```bash
#!/bin/bash
# scripts/security-update.sh

set -euo pipefail

echo "Starting security update process..."

# Check for npm security vulnerabilities
echo "📋 Checking for npm vulnerabilities..."
cd hft-trading-frontend
npm audit --audit-level=high

# Update dependencies
echo "Updating dependencies..."
npm update
npm audit fix

# Rebuild Docker image
echo "Rebuilding Docker image..."
docker build -t hft-frontend:security-update .

# Push to registry
echo "📤 Pushing to registry..."
docker tag hft-frontend:security-update ghcr.io/your-org/hft-trading-platform/frontend:security-update
docker push ghcr.io/your-org/hft-trading-platform/frontend:security-update

# Deploy to staging for testing
echo "🧪 Deploying to staging..."
kubectl set image deployment/hft-frontend \
    frontend=ghcr.io/your-org/hft-trading-platform/frontend:security-update \
    -n staging

# Wait for deployment
kubectl rollout status deployment/hft-frontend -n staging --timeout=300s

# Run security tests
echo "🔐 Running security tests..."
npm run test:security

echo "Security update completed!"
```
