#!/usr/bin/env node

// This file will be the entry point after build
// During development, use: npm run dev
// After build, this will reference the compiled dist/index.js

// Support both ESM and CJS
import('../dist/index.js').catch(() => import('../dist/index.cjs'));
