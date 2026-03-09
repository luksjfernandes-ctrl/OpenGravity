---
name: security-review
description: Enforce security best practices and identify vulnerabilities across all code. Use this skill when implementing authentication or authorization, handling user input or file uploads, creating new API endpoints, managing secrets or credentials, building payment flows, storing or transmitting sensitive data, integrating third-party APIs, or writing any backend/fullstack code that touches user data. Trigger on any request involving login, sessions, databases, file handling, environment variables, or API keys.
---

This skill ensures all code follows security best practices and is free from common vulnerabilities. Apply it proactively — do not wait for the user to ask for a "security review." If code involves user data, credentials, or external inputs, these rules apply automatically.

## Core Principle

Security is not optional. A single vulnerability can compromise an entire platform. When in doubt, choose the more cautious approach.

---

## 1. Secret Management

**NEVER hardcode secrets in source code.**

```typescript
// ❌ FORBIDDEN
const apiKey = "sk-proj-xxxxx"
const dbPassword = "password123"

// ✅ REQUIRED
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

**Checklist:**
- No hardcoded API keys, tokens, or passwords anywhere in code
- All secrets loaded from environment variables
- `.env.local` added to `.gitignore`
- Production secrets stored in hosting platform (Vercel, Railway, etc.)

---

## 2. Input Validation

**Always validate all user input with a schema before processing.**

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
}
```

**File upload validation:**
```typescript
function validateFileUpload(file: File) {
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) throw new Error('File too large (max 5MB)')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type')

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!ext || !allowedExtensions.includes(ext)) throw new Error('Invalid file extension')

  return true
}
```

**Checklist:**
- All user input validated with schema (whitelist, not blacklist)
- File uploads restricted by size, MIME type, and extension
- User input never used directly in queries
- Error messages do not reveal internal details

---

## 3. SQL Injection Prevention

**NEVER concatenate user input into SQL strings.**

```typescript
// ❌ DANGEROUS
const query = `SELECT * FROM users WHERE email = '${userEmail}'`

// ✅ SAFE — parameterized query
await db.query('SELECT * FROM users WHERE email = $1', [userEmail])

// ✅ SAFE — ORM / Supabase
const { data } = await supabase.from('users').select('*').eq('email', userEmail)
```

**Checklist:**
- All database queries use parameterized statements or ORM methods
- No string concatenation inside SQL
- Supabase queries use chained filter methods, never raw interpolation

---

## 4. Authentication & Authorization

**Store tokens in httpOnly cookies, not localStorage.**

```typescript
// ❌ Vulnerable to XSS
localStorage.setItem('token', token)

// ✅ Secure
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

**Always check authorization before performing sensitive operations:**

```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } })

  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await db.users.delete({ where: { id: userId } })
}
```

**Enable Row Level Security on all Supabase tables:**

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON users FOR UPDATE USING (auth.uid() = id);
```

**Checklist:**
- Tokens in httpOnly cookies only
- Authorization checked before every sensitive operation
- Role-based access control in place
- Supabase RLS enabled on all tables
- Session management is secure

---

## 5. XSS Prevention

**Sanitize all user-provided HTML before rendering.**

```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

**Set Content Security Policy headers:**

```javascript
// next.config.js
const securityHeaders = [{
  key: 'Content-Security-Policy',
  value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.example.com;`
}]
```

**Checklist:**
- All user-provided HTML sanitized with DOMPurify
- CSP headers configured
- React's built-in XSS protection leveraged (avoid `dangerouslySetInnerHTML` unless sanitized)

---

## 6. CSRF Protection

```typescript
export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')
  if (!csrf.verify(token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  // handle request
}
```

**Checklist:**
- CSRF tokens on all state-changing operations (POST, PUT, DELETE)
- All cookies set with `SameSite=Strict`

---

## 7. Rate Limiting

**Apply rate limits to all API endpoints. Stricter limits on expensive operations.**

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 })

app.use('/api/', limiter)
app.use('/api/search', searchLimiter)
```

**Checklist:**
- All endpoints have rate limiting
- Auth endpoints and search have stricter limits
- Both IP-based and user-based limiting in place

---

## 8. Sensitive Data Exposure

**Never log passwords, tokens, card numbers, or secrets.**

```typescript
// ❌ Leaks sensitive data
console.log('Login:', { email, password })

// ✅ Safe
console.log('Login:', { email, userId })

// ❌ Exposes internals
return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })

// ✅ Generic error to client, full detail server-side only
console.error('Internal error:', error)
return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
```

**Checklist:**
- No passwords, tokens, or secrets in logs
- Generic error messages returned to clients
- Stack traces only in server logs

---

## 9. Dependency Security

```bash
npm audit          # check for vulnerabilities
npm audit fix      # auto-fix what's safe
npm outdated       # review outdated packages
npm ci             # use in CI/CD for reproducible builds
```

**Checklist:**
- `npm audit` returns clean
- Lock file (`package-lock.json`) committed
- Dependabot or equivalent enabled
- Dependencies reviewed regularly

---

## Pre-Deploy Security Checklist

Before any production deployment, verify ALL of the following:

**Secrets & Config**
- [ ] No hardcoded secrets anywhere in code
- [ ] All secrets in environment variables
- [ ] `.env` files in `.gitignore`

**Input & Data**
- [ ] All user input schema-validated
- [ ] All DB queries parameterized
- [ ] File uploads restricted by size, type, and extension

**Auth & Access**
- [ ] Tokens in httpOnly cookies (not localStorage)
- [ ] Authorization checks before sensitive operations
- [ ] RBAC implemented
- [ ] Supabase RLS enabled

**Transport & Headers**
- [ ] HTTPS enforced in production
- [ ] CSP, X-Frame-Options, and security headers set
- [ ] CORS configured correctly
- [ ] CSRF protection on state-changing routes

**Logging & Errors**
- [ ] No sensitive data in logs
- [ ] Generic error messages to clients
- [ ] Internal errors logged server-side only

**Dependencies**
- [ ] `npm audit` clean
- [ ] Lock file committed
- [ ] No critically outdated packages

---

## Security Test Templates

```typescript
test('requires authentication', async () => {
  const res = await fetch('/api/protected')
  expect(res.status).toBe(401)
})

test('requires admin role', async () => {
  const res = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(res.status).toBe(403)
})

test('rejects invalid input', async () => {
  const res = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(res.status).toBe(400)
})

test('enforces rate limits', async () => {
  const responses = await Promise.all(Array(101).fill(null).map(() => fetch('/api/endpoint')))
  expect(responses.filter(r => r.status === 429).length).toBeGreaterThan(0)
})
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Web Security Academy](https://portswigger.net/web-security)
