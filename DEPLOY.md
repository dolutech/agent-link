# Deployment Guide

> Instructions for deploying AgentLink Protocol to npm

---

## Prerequisites

- npmjs.com account (https://www.npmjs.com/signup)
- GitHub account

---

## Deploy to GitHub

```bash
# Push to GitHub
git push -u origin main
```

Visit: https://github.com/dolutech/agent-link

---

## Deploy to npm

### 1. Login

```bash
npm adduser
```

Enter your credentials when prompted.

### 2. Build

```bash
npm run build
```

### 3. Test

```bash
npm test
```

### 4. Publish

```bash
npm publish --access public
```

### 5. Verify

```bash
npm view @dolutech/agent-link
```

Visit: https://www.npmjs.com/package/@dolutech/agent-link

---

## Security Notes

- ⚠️ **NEVER** commit npm tokens to git
- ⚠️ **NEVER** share your npm password
- ✅ Use npm tokens for automation
- ✅ Store tokens in a password manager

---

**DoluTech © 2026**
