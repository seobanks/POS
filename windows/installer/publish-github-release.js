const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required.');
  process.exit(1);
}
const OWNER = 'seobanks';
const REPO = 'POS';
const TAG = 'v1.0.0';
const EXE_PATH = 'C:\\hp-dist\\HanvaPOS-Setup-v1.0.0.exe';
const ASSET_NAME = 'HanvaPOS-Setup-v1.0.0.exe';

function apiRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Node-Release-Uploader',
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(options.headers || {})
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`GitHub API Error (${res.statusCode}): ${json.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
          else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function uploadFileStream(uploadUrlTemplate, filePath, fileName) {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  console.log(`Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  // uploadUrlTemplate format: "https://uploads.github.com/repos/seobanks/POS/releases/123/assets{?name,label}"
  const rawUrl = uploadUrlTemplate.split('{')[0] + `?name=${encodeURIComponent(fileName)}`;
  const u = new URL(rawUrl);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'User-Agent': 'Node-Release-Uploader',
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Length': fileSize
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Asset upload error (${res.statusCode}): ${json.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
          else reject(new Error(`Asset upload HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    let uploaded = 0;
    let lastLogTime = Date.now();

    stream.on('data', (chunk) => {
      uploaded += chunk.length;
      const now = Date.now();
      if (now - lastLogTime > 3000) {
        const pct = ((uploaded / fileSize) * 100).toFixed(1);
        console.log(`Progress: ${pct}% (${(uploaded / (1024 * 1024)).toFixed(1)} MB / ${(fileSize / (1024 * 1024)).toFixed(1)} MB)`);
        lastLogTime = now;
      }
    });

    stream.on('end', () => {
      console.log('Finished streaming file to GitHub. Waiting for final response...');
    });

    stream.pipe(req);
  });
}

async function main() {
  if (!fs.existsSync(EXE_PATH)) {
    throw new Error(`Executable not found at ${EXE_PATH}`);
  }

  console.log(`[1/3] Creating Release ${TAG} on github.com/${OWNER}/${REPO}...`);
  const release = await apiRequest(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST'
  }, {
    tag_name: TAG,
    target_commitish: 'main',
    name: `Hanva Fine Dine POS ${TAG} - Windows Desktop Installer`,
    body: `### Hanva Fine Dine POS - Production Release ${TAG}\n\n` +
      `Commercial offline-first restaurant billing POS with native system tray launcher, bundled PostgreSQL, and local Wi-Fi mesh.\n\n` +
      `#### 📦 Included Distribution Assets:\n` +
      `- **\`${ASSET_NAME}\`**: One-click Windows 10/11 x64 installer\n` +
      `- Embedded Node.js runtime & PostgreSQL 16 database\n` +
      `- Zero-dependency auto-initialization & local seed\n` +
      `- ESC/POS thermal printing with Dynamic NPCI UPI QR code receipts\n` +
      `- Wi-Fi LAN IP broadcast for waiter tablet mesh\n`,
    draft: false,
    prerelease: false
  });

  console.log(`[✓] Release created! ID: ${release.id}`);
  console.log(`    Release URL: ${release.html_url}`);
  console.log(`    Upload URL: ${release.upload_url}`);

  console.log(`\n[2/3] Uploading installer asset (${ASSET_NAME})...`);
  const asset = await uploadFileStream(release.upload_url, EXE_PATH, ASSET_NAME);
  console.log(`[✓] Asset uploaded successfully!`);
  console.log(`    Asset ID: ${asset.id}`);
  console.log(`    Download URL: ${asset.browser_download_url}`);

  console.log(`\n[3/3] Direct Public Download Link is now live:`);
  console.log(`    https://github.com/${OWNER}/${REPO}/releases/latest/download/${ASSET_NAME}`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
