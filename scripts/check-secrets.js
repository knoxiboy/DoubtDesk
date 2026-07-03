const { execFileSync } = require('child_process');
const fs = require('fs');

let inScanningPhase = false;

try {
  // Get list of staged files using execFileSync to avoid shell command injection
  const stagedFilesOutput = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  const stagedFiles = stagedFilesOutput
    .split('\n')
    .map(f => f.trim())
    .filter(f => f && fs.existsSync(f) && fs.lstatSync(f).isFile());

  const secretRegex = /(?:pk|sk)_(?:test|live)_(?!your_key_here|placeholder)[a-zA-Z0-9_.\-$]{15,}/gi;
  let foundSecrets = false;

  inScanningPhase = true;

  for (const file of stagedFiles) {
    // Read the staged content of the file using execFileSync with args array
    const content = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    
    // Scan for secrets
    const matches = content.match(secretRegex);
    if (matches) {
      console.error(`\x1b[31m[ERROR] Potential Clerk secret key found in staged file: ${file}\x1b[0m`);
      for (const match of matches) {
        console.error(`  Found: ${match.substring(0, 15)}...`);
      }
      foundSecrets = true;
    }
  }

  if (foundSecrets) {
    console.error('\x1b[31mCommit aborted. Please remove the exposed secrets or replace them with placeholders.\x1b[0m');
    process.exit(1);
  }
} catch (error) {
  if (inScanningPhase) {
    // Fail closed for unexpected failures during scan phase
    console.error(`\x1b[31m[ERROR] Secrets check failed during scan: ${error.message}\x1b[0m`);
    process.exit(1);
  } else {
    // Fail open only for initial git/setup environment check issues (e.g. git command not found)
    console.warn(`[WARNING] Secrets check bypassed due to setup/env error: ${error.message}`);
    process.exit(0);
  }
}
