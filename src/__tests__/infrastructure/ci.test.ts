import fs from 'fs';
import path from 'path';

describe('CI Infrastructure Configuration', () => {
  const codeQualityYamlPath = path.join(process.cwd(), '.github', 'workflows', 'pr-code-quality.yml');
  const testYamlPath = path.join(process.cwd(), '.github', 'workflows', 'test.yml');

  describe('Phase 1: CI Strictness', () => {
    it('should not contain "continue-on-error: true" in typecheck, lint, or build jobs in pr-code-quality.yml', () => {
      const content = fs.readFileSync(codeQualityYamlPath, 'utf8');
      
      const typecheckJob = content.substring(content.indexOf('typecheck:'), content.indexOf('lint:'));
      const lintJob = content.substring(content.indexOf('lint:'), content.indexOf('build:'));
      const buildJob = content.substring(content.indexOf('build:'), content.indexOf('security-scan:'));
      
      expect(typecheckJob).not.toContain('continue-on-error: true');
      expect(lintJob).not.toContain('continue-on-error: true');
      expect(buildJob).not.toContain('continue-on-error: true');
    });

    it('should not contain "--passWithNoTests" in test.yml', () => {
      const content = fs.readFileSync(testYamlPath, 'utf8');
      expect(content).not.toContain('--passWithNoTests');
    });
  });

  describe('Phase 2: CI Migration Validation', () => {
    it('should contain a "migration-validation" job in pr-code-quality.yml', () => {
      const content = fs.readFileSync(codeQualityYamlPath, 'utf8');
      expect(content).toContain('migration-validation:');
    });

    it('should run "npx drizzle-kit generate" and check "git status --porcelain"', () => {
      const content = fs.readFileSync(codeQualityYamlPath, 'utf8');
      expect(content).toContain('npx drizzle-kit generate');
      expect(content).toContain('git status --porcelain');
    });
  });

  describe('Phase 3: Setup Pre-commit Hooks', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const precommitPath = path.join(process.cwd(), '.husky', 'pre-commit');

    it('should contain "husky" and "lint-staged" in devDependencies in package.json', () => {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.devDependencies).toHaveProperty('husky');
      expect(packageJson.devDependencies).toHaveProperty('lint-staged');
    });

    it('should have a lint-staged configuration for .ts and .tsx files', () => {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson['lint-staged']).toBeDefined();
      expect(packageJson['lint-staged']['*.{ts,tsx}']).toBeDefined();
      expect(packageJson['lint-staged']['*.{ts,tsx}']).toContain('eslint --fix');
    });

    it('should have a .husky/pre-commit file that runs lint-staged', () => {
      expect(fs.existsSync(precommitPath)).toBe(true);
      const precommitContent = fs.readFileSync(precommitPath, 'utf8');
      expect(precommitContent).toContain('npx lint-staged');
    });
  });
});
