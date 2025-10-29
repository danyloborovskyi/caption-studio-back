#!/usr/bin/env node

/**
 * Secret Detection Script
 *
 * Run this before committing to check for potential secrets
 * Usage: node check-secrets.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PATTERNS = [
  // API Keys
  /sk-[a-zA-Z0-9]{32,}/g,
  /eyJ[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{30,}/g,

  // Supabase
  /supabase_service_key\s*=\s*["']eyJ[^"']+["']/gi,
  /SUPABASE_SERVICE_KEY\s*=\s*eyJ[^\s]+/gi,

  // Generic secrets
  /password\s*=\s*["'][^"']{8,}["']/gi,
  /api[_-]?key\s*=\s*["'][^"']{16,}["']/gi,
  /secret\s*=\s*["'][^"']{16,}["']/gi,
];

const IGNORE_PATTERNS = [
  /process\.env/i,
  /YOUR_/i,
  /EXAMPLE/i,
  /placeholder/i,
  /\.\.\./, // Ellipsis in examples
  /xxxxx/i,
  /template/i,
  /check-secrets\.js/, // This file
];

const EXCLUDED_DIRS = ["node_modules", ".git", "dist", "build", "coverage"];

const INCLUDED_EXTENSIONS = [".js", ".json", ".md", ".env", ".txt"];

function shouldIgnoreLine(line) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(line));
}

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const findings = [];

    lines.forEach((line, lineNumber) => {
      if (shouldIgnoreLine(line)) return;

      PATTERNS.forEach((pattern) => {
        const matches = line.match(pattern);
        if (matches) {
          findings.push({
            file: filePath,
            line: lineNumber + 1,
            content: line.trim().substring(0, 80),
            pattern: pattern.toString(),
          });
        }
      });
    });

    return findings;
  } catch (error) {
    return [];
  }
}

function walkDirectory(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        walkDirectory(fullPath, files);
      }
    } else {
      const ext = path.extname(entry.name);
      if (INCLUDED_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function checkGitStaged() {
  try {
    const staged = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    });
    return staged.split("\n").filter((f) => f.trim());
  } catch {
    return [];
  }
}

function main() {
  console.log("🔍 Scanning for potential secrets...\n");

  const stagedFiles = checkGitStaged();
  let allFindings = [];

  if (stagedFiles.length > 0) {
    console.log(`📝 Checking ${stagedFiles.length} staged files...\n`);

    stagedFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        const findings = checkFile(file);
        allFindings = allFindings.concat(findings);
      }
    });
  } else {
    console.log("📂 Checking all files in repository...\n");

    const allFiles = walkDirectory(".");
    console.log(`Found ${allFiles.length} files to scan\n`);

    allFiles.forEach((file) => {
      const findings = checkFile(file);
      allFindings = allFindings.concat(findings);
    });
  }

  if (allFindings.length === 0) {
    console.log("✅ No potential secrets detected!\n");
    console.log("Your repository appears to be secure.");
    process.exit(0);
  } else {
    console.log(`⚠️  Found ${allFindings.length} potential secret(s):\n`);

    allFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding.file}:${finding.line}`);
      console.log(`   ${finding.content}`);
      console.log("");
    });

    console.log("⚠️  WARNING: Potential secrets detected!");
    console.log("Please review these findings carefully.\n");
    console.log("If these are real secrets:");
    console.log("  1. DO NOT commit them");
    console.log("  2. Move them to .env file");
    console.log("  3. Use process.env to access them\n");
    console.log("If these are examples/documentation:");
    console.log('  - Add "EXAMPLE" or "YOUR_" prefix');
    console.log('  - Truncate with "..." ');
    console.log('  - Use placeholder values like "xxxxx"\n');

    process.exit(1);
  }
}

// Run the check
main();

