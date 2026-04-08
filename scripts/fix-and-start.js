/**
 * 1. Clears .next cache
 * 2. Patches plugins.js so autoprefixer resolves correctly
 * 3. Verifies autoprefixer is findable
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.resolve(__dirname, '..')

// 1. Clear .next
const nextDir = path.join(root, '.next')
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true })
  console.log('✓ Cleared .next cache')
} else {
  console.log('✓ No .next cache to clear')
}

// 2. Patch plugins.js
const pluginsPath = path.join(root, 'node_modules/next/dist/build/webpack/config/blocks/css/plugins.js')
let src = fs.readFileSync(pluginsPath, 'utf8')

const OLD = `const pluginPath = require.resolve(pluginName, {
        paths: [
            dir
        ]
    });`

const NEW = `let pluginPath;
    const resolvePaths = [dir, require('path').resolve(__dirname, '../../../../../../../..'), require('path').join(require('path').resolve(__dirname, '../../../../../../../..'), 'node_modules')];
    try { pluginPath = require.resolve(pluginName, { paths: resolvePaths }); }
    catch(e) { throw new Error('Cannot find PostCSS plugin "' + pluginName + '". Run: npm install ' + pluginName + '\\n' + e.message); }`

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW)
  fs.writeFileSync(pluginsPath, src)
  console.log('✓ Patched plugins.js with extended resolve paths')
} else if (src.includes('resolvePaths')) {
  console.log('✓ plugins.js already patched')
} else {
  console.log('⚠ Could not find patch target in plugins.js — may already be patched differently')
}

// 3. Verify
try {
  const ap = require.resolve('autoprefixer', { paths: [root] })
  console.log('✓ autoprefixer resolves to:', ap)
} catch(e) {
  console.log('✗ autoprefixer NOT found:', e.message)
}

console.log('\nAll done — start the dev server now.')
