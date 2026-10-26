#!/bin/bash
set -e

echo "=== Release Verification ==="

# 1. Check package.json version is valid semver
VERSION=$(node -p "require('./package.json').version")
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]; then
  echo "FAIL: Invalid version in package.json: $VERSION"
  exit 1
fi
echo "OK Version: $VERSION"

# 2. Check CHANGELOG.md exists and has entry for this version
if ! grep -q "## $VERSION" CHANGELOG.md; then
  echo "FAIL: CHANGELOG.md missing entry for version $VERSION"
  exit 1
fi
echo "OK CHANGELOG has entry for $VERSION"

# 3. Check git tag exists
if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "FAIL: Git tag v$VERSION not found"
  exit 1
fi
echo "OK Git tag v$VERSION exists"

# 4. Run tests
echo "Running tests..."
npm test

# 5. Build
echo "Building..."
npm run build && npm run build:modern

# 6. Security audit
echo "Security audit..."
npm run audit:ci

echo "=== Release Verification PASSED ==="