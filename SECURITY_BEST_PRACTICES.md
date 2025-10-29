# Security Best Practices

## 🔐 Handling Secrets & API Keys

### DO ✅

1. **Use Environment Variables**

   ```javascript
   // CORRECT
   const apiKey = process.env.OPENAI_API_KEY;
   const supabaseUrl = process.env.SUPABASE_URL;
   ```

2. **Keep `.env` in `.gitignore`**

   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

3. **Use `.env.template` for Structure**

   ```env
   # .env.template - Safe to commit
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_anon_key_here
   # DO NOT put real values here
   ```

4. **Rotate Keys Regularly**

   - Every 90 days minimum
   - Immediately if suspected exposure
   - After team member changes

5. **Use Different Keys per Environment**
   - Development keys
   - Staging keys
   - Production keys

### DON'T ❌

1. **Never Hardcode Secrets**

   ```javascript
   // WRONG - NEVER DO THIS - EXAMPLE ONLY
   const apiKey = "sk-EXAMPLE_NEVER_DO_THIS";
   const supabaseUrl = "https://myproject.supabase.co";
   ```

2. **Never Commit `.env` Files**

   ```bash
   # If accidentally staged:
   git reset HEAD .env
   git checkout -- .env
   ```

3. **Never Share Keys in Chat/Email**

   - Use secure password managers
   - Use secret sharing services (1Password, Bitwarden)
   - Never send via Slack, Discord, email

4. **Never Put Keys in Documentation**

   ```markdown
   <!-- WRONG -->

   Use this token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real_token_here

   <!-- CORRECT -->

   Use this token: YOUR_ACCESS_TOKEN_HERE
   Replace YOUR_ACCESS_TOKEN_HERE with your actual token.
   ```

## 🔍 Before Every Commit

### Pre-Commit Checklist

```bash
# 1. Check for secrets in staged files
git diff --cached | grep -i "key\|password\|secret\|token"

# 2. Verify .env is not staged
git status | grep .env

# 3. Review changes
git diff --cached
```

### Automated Checks (Recommended)

Install `git-secrets`:

```bash
# Install
npm install -g git-secrets

# Setup
git secrets --install
git secrets --register-aws
git secrets --add 'sk-[0-9a-zA-Z]{32,}'
git secrets --add 'eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'
```

## 🚨 If Secrets Are Exposed

### Immediate Actions

1. **Revoke the Exposed Keys** (within 1 hour)

   **Supabase:**

   ```
   1. Go to: https://app.supabase.com/project/_/settings/api
   2. Click "Reset" for exposed keys
   3. Copy new keys to secure location
   ```

   **OpenAI:**

   ```
   1. Go to: https://platform.openai.com/api-keys
   2. Click "Revoke" on exposed key
   3. Create new key
   ```

2. **Remove from Git History**

   **Option A: Using BFG (Recommended)**

   ```bash
   # Install BFG
   # Download from: https://rtyley.github.io/bfg-repo-cleaner/

   # Remove secrets
   java -jar bfg.jar --replace-text secrets.txt
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

   **Option B: Using git-filter-repo**

   ```bash
   # Install
   pip install git-filter-repo

   # Remove file
   git filter-repo --path .env --invert-paths
   git push --force
   ```

3. **Update All Environments**

   - Development `.env`
   - Staging environment variables
   - Production environment variables (Render)

4. **Notify Team**
   - Inform all developers
   - Update deployment pipeline
   - Document incident

### Prevention

1. **Use Secret Scanning**

   - GitHub: Enable secret scanning in repository settings
   - GitLab: Enable secret detection
   - Use `truffleHog` for local scanning

2. **Set Up Pre-Commit Hooks**

   ```bash
   # .husky/pre-commit
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"

   # Check for secrets
   if git diff --cached | grep -i "sk-\|eyJ.*\=\=\|password.*[=:]"; then
     echo "❌ Potential secret detected! Commit aborted."
     exit 1
   fi
   ```

3. **Use Environment Variable Management**
   - **Production:** Render Environment Variables
   - **Local:** `.env` files (gitignored)
   - **Team:** Use secret managers (1Password, Vault)

## 📋 Key Rotation Schedule

### Supabase Keys

- **Anon Key:** Every 90 days or on suspicious activity
- **Service Key:** Every 90 days or on team changes

### OpenAI API Key

- **Rotation:** Every 90 days
- **Monitor:** Usage dashboard for anomalies

### JWT Secrets (if used)

- **Rotation:** Every 60 days minimum
- **Complexity:** Minimum 32 characters, random

## 🛡️ Production Deployment Checklist

### Environment Variables (Render.com)

1. **Set in Render Dashboard**

   ```
   Settings → Environment → Environment Variables
   ```

2. **Never in Repository**

   - ❌ Don't commit to GitHub
   - ✅ Set in Render dashboard
   - ✅ Use Render's built-in secret management

3. **Verify Configuration**
   ```bash
   # Check if variables are loaded
   curl https://your-api.onrender.com/health
   ```

### Access Control

1. **Limit Access**

   - Only authorized team members
   - Use Render's team permissions
   - Enable 2FA for all accounts

2. **Audit Logs**
   - Review Render access logs
   - Monitor API usage
   - Set up alerts for anomalies

## 📚 Resources

### Tools

- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) - Remove secrets from history
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - Scan for secrets
- [detect-secrets](https://github.com/Yelp/detect-secrets) - Secret detection

### Documentation

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)

---

**Last Updated:** 2025-10-29  
**Review Frequency:** Quarterly or after security incidents
