const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Get list of staged files
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(f => f && fs.existsSync(f) && fs.lstatSync(f).isFile());

  const secretRegex = /(?:pk|sk)_(?:test|live)_(?!your_key_here|placeholder)[a-zA-Z0-9_.\-$]{15,}/gi;
  let foundSecrets = false;

  for (const file of stagedFiles) {
    // Read the staged content of the file
    const content = execSync(`git show :${file}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    
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
  console.error('Error running secrets check:', error.message);
  process.exit(0); // Do not block commit if script itself has issues
}
