import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('==========================================');
console.log('🔄 NXLINK Token Refresh & Worker Deployment');
console.log('==========================================');

const pyScriptPath = path.join(ROOT_DIR, 'nxlink_get_plat_token.py');
const wranglerPath = path.join(ROOT_DIR, 'wrangler.toml');

if (!fs.existsSync(pyScriptPath)) {
  console.error('❌ nxlink_get_plat_token.py not found in project root.');
  process.exit(1);
}

console.log('🔑 Scraping fresh plat_token via Playwright (.nxlink_creds)...');
let token = '';
try {
  token = execSync(`python3 "${pyScriptPath}" --no-session`, { encoding: 'utf8', cwd: ROOT_DIR }).trim();
} catch (err) {
  console.error('❌ Error getting token:', err.message);
  process.exit(1);
}

if (!token || !token.startsWith('ey')) {
  console.error('❌ Invalid token received:', token);
  process.exit(1);
}

console.log(`✓ Fresh token retrieved: ${token.slice(0, 25)}...`);

if (fs.existsSync(wranglerPath)) {
  let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  if (wranglerContent.includes('NXLINK_PLAT_TOKEN =')) {
    wranglerContent = wranglerContent.replace(
      /NXLINK_PLAT_TOKEN\s*=\s*"[^"]*"/,
      `NXLINK_PLAT_TOKEN = "${token}"`
    );
  } else {
    wranglerContent += `\nNXLINK_PLAT_TOKEN = "${token}"\n`;
  }
  fs.writeFileSync(wranglerPath, wranglerContent, 'utf8');
  console.log('✓ Updated NXLINK_PLAT_TOKEN in wrangler.toml');
}

console.log('\n🚀 Deploying updated worker to Cloudflare...');
try {
  const deployOutput = execSync('npx wrangler deploy', { encoding: 'utf8', cwd: ROOT_DIR });
  console.log(deployOutput);
  console.log('✅ Cloudflare Worker deployed with fresh token successfully!');
} catch (err) {
  console.warn('⚠️ Wrangler deploy error:', err.message);
  console.log('You can deploy manually by running: npx wrangler deploy');
}
