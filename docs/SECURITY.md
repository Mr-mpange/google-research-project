# 🔒 Security Documentation

## Overview

This document details the comprehensive security measures implemented in the AI-Powered Research Data Collection System to protect user data, ensure system integrity, and maintain compliance with data protection regulations.

---

## 🛡️ Security Architecture

### Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     External Layer                          │
│  • TLS 1.3 Encryption                                       │
│  • DDoS Protection (Cloud Provider)                         │
│  • WAF (Web Application Firewall)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  • Rate Limiting                                            │
│  • Input Validation                                         │
│  • Authentication (JWT)                                     │
│  • Authorization (RBAC)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  • Encryption at Rest (AES-256)                             │
│  • Parameterized Queries                                    │
│  • PII Anonymization                                        │
│  • Audit Logging                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Authorization

### JWT-Based Authentication

#### Token Generation

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      jti: crypto.randomUUID(), // Unique token ID
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      algorithm: 'HS256',
      issuer: 'research-system',
      audience: 'research-api'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'research-system',
        audience: 'research-api'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
```

#### Token Security Features

- **Short Expiration:** 24-hour default (configurable)
- **Secure Algorithm:** HS256 (HMAC with SHA-256)
- **Unique Token ID (jti):** Prevents token reuse
- **Issuer/Audience Claims:** Prevents token misuse
- **Refresh Token Support:** Separate long-lived refresh tokens

### Password Security

```javascript
const bcrypt = require('bcryptjs');

class PasswordService {
  async hashPassword(password) {
    // Validate password strength
    this.validatePasswordStrength(password);
    
    // Hash with bcrypt (12 rounds)
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!hasUpperCase || !hasLowerCase) {
      throw new Error('Password must contain uppercase and lowercase letters');
    }
    if (!hasNumbers) {
      throw new Error('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new Error('Password must contain at least one special character');
    }
  }
}
```

#### Password Requirements

- **Minimum Length:** 8 characters
- **Complexity:** Uppercase, lowercase, numbers, special characters
- **Hashing:** bcrypt with 12 rounds (cost factor)
- **No Password Reuse:** Last 5 passwords stored (hashed)
- **Password Expiry:** Optional 90-day rotation

### Role-Based Access Control (RBAC)

```javascript
const roles = {
  admin: {
    permissions: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'questions:create', 'questions:read', 'questions:update', 'questions:delete',
      'responses:read', 'responses:export', 'responses:delete',
      'ai:process', 'ai:configure',
      'sms:send', 'sms:bulk',
      'analytics:view', 'analytics:export',
      'system:configure', 'system:logs'
    ]
  },
  researcher: {
    permissions: [
      'questions:read',
      'responses:read', 'responses:export',
      'ai:process',
      'sms:send',
      'analytics:view', 'analytics:export'
    ]
  },
  viewer: {
    permissions: [
      'questions:read',
      'responses:read',
      'analytics:view'
    ]
  }
};

// Middleware for permission checking
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = roles[userRole]?.permissions || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Usage
app.delete('/api/responses/:id', 
  authenticate, 
  requirePermission('responses:delete'),
  deleteResponse
);
```

---

## 🔒 Data Protection

### Encryption

#### In Transit (TLS 1.3)

```javascript
const https = require('https');
const fs = require('fs');

const tlsOptions = {
  key: fs.readFileSync('ssl/private-key.pem'),
  cert: fs.readFileSync('ssl/certificate.pem'),
  ca: fs.readFileSync('ssl/ca-bundle.pem'),
  
  // TLS 1.3 only
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  
  // Strong cipher suites
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  
  // Perfect Forward Secrecy
  honorCipherOrder: true,
  
  // HSTS
  secureOptions: require('constants').SSL_OP_NO_TLSv1 | 
                 require('constants').SSL_OP_NO_TLSv1_1
};

https.createServer(tlsOptions, app).listen(443);
```

#### At Rest (AES-256)

```javascript
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.key = this.deriveKey(process.env.ENCRYPTION_KEY);
  }

  deriveKey(password) {
    return crypto.scryptSync(password, 'salt', this.keyLength);
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for sensitive data
const encryptionService = new EncryptionService();

// Encrypt before storing
const sensitiveData = 'User personal information';
const { encrypted, iv, authTag } = encryptionService.encrypt(sensitiveData);

await db.query(
  'INSERT INTO sensitive_data (data, iv, auth_tag) VALUES ($1, $2, $3)',
  [encrypted, iv, authTag]
);

// Decrypt when retrieving
const result = await db.query('SELECT * FROM sensitive_data WHERE id = $1', [id]);
const decrypted = encryptionService.decrypt(
  result.rows[0].data,
  result.rows[0].iv,
  result.rows[0].auth_tag
);
```

### PII Protection

#### Anonymization

```javascript
class PIIProtectionService {
  // Phone number anonymization
  anonymizePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 10) {
      return '***';
    }
    
    // Keep first 3 and last 3 digits
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 3);
    const masked = '*'.repeat(phoneNumber.length - 6);
    
    return `${start}${masked}${end}`;
    // +254712345678 → +25******678
  }

  // Email anonymization
  anonymizeEmail(email) {
    if (!email || !email.includes('@')) {
      return '***@***.***';
    }
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + 
                          '*'.repeat(username.length - 2) + 
                          username.charAt(username.length - 1);
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.charAt(0) + 
                        '*'.repeat(domainName.length - 1);
    
    return `${maskedUsername}@${maskedDomain}.${tld}`;
    // john.doe@example.com → j*****e@e******.com
  }

  // Name anonymization
  anonymizeName(name) {
    if (!name) return '***';
    
    const parts = name.split(' ');
    return parts.map(part => 
      part.charAt(0) + '*'.repeat(part.length - 1)
    ).join(' ');
    // John Doe → J*** D**
  }

  // Automatic PII detection and redaction
  redactPII(text) {
    // Phone numbers
    text = text.replace(/\+?\d{10,15}/g, '[PHONE]');
    
    // Email addresses
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
    
    // Credit card numbers
    text = text.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[CARD]');
    
    // National IDs (example pattern)
    text = text.replace(/\b\d{8,12}\b/g, '[ID]');
    
    return text;
  }
}

// Usage in logging
logger.info('User response received', {
  phone: piiService.anonymizePhoneNumber(phoneNumber),
  email: piiService.anonymizeEmail(email),
  response: piiService.redactPII(responseText)
});
```

#### Data Minimization

```javascript
// Only collect necessary data
const userSchema = {
  // Required fields only
  phoneNumber: { type: 'string', required: true },
  responseText: { type: 'string', required: true },
  questionId: { type: 'uuid', required: true },
  
  // Optional demographic data (with explicit consent)
  age: { type: 'integer', optional: true, consent: true },
  gender: { type: 'string', optional: true, consent: true },
  location: { type: 'string', optional: true, consent: true },
  
  // Never collect
  // - Full name (unless absolutely necessary)
  // - National ID
  // - Financial information
  // - Health information (unless research-specific)
};
```

### Data Retention

```javascript
class DataRetentionService {
  constructor() {
    this.retentionPolicies = {
      audioFiles: 90,        // days
      transcriptions: 365,   // days
      summaries: -1,         // indefinite (anonymized)
      personalData: 730,     // days (2 years)
      auditLogs: 2555        // days (7 years)
    };
  }

  async enforceRetentionPolicies() {
    // Delete old audio files
    await this.deleteOldData('audio_files', this.retentionPolicies.audioFiles);
    
    // Delete old transcriptions
    await this.deleteOldData('transcriptions', this.retentionPolicies.transcriptions);
    
    // Anonymize old personal data
    await this.anonymizeOldData('research_responses', this.retentionPolicies.personalData);
    
    logger.info('Data retention policies enforced');
  }

  async deleteOldData(table, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await db.query(
      `DELETE FROM ${table} WHERE created_at < $1`,
      [cutoffDate]
    );
    
    logger.info(`Deleted ${result.rowCount} old records from ${table}`);
  }

  async anonymizeOldData(table, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    await db.query(`
      UPDATE ${table}
      SET phone_number = 'ANONYMIZED',
          metadata = jsonb_set(metadata, '{anonymized}', 'true')
      WHERE created_at < $1 AND phone_number != 'ANONYMIZED'
    `, [cutoffDate]);
  }
}

// Run daily
setInterval(() => {
  dataRetentionService.enforceRetentionPolicies();
}, 24 * 60 * 60 * 1000); // 24 hours
```

---

## 🛡️ Input Validation & Sanitization

### Request Validation

```javascript
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Example: Validate research response
const validateResponse = [
  body('phoneNumber')
    .trim()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Invalid phone number format'),
  
  body('responseText')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Response must be between 10 and 5000 characters')
    .escape(), // XSS protection
  
  body('questionId')
    .isUUID()
    .withMessage('Invalid question ID'),
  
  body('language')
    .optional()
    .isIn(['en', 'sw'])
    .withMessage('Language must be en or sw'),
  
  validateRequest
];

app.post('/api/responses', validateResponse, createResponse);
```

### SQL Injection Prevention

```javascript
// ✅ GOOD: Parameterized queries
const getResponseById = async (id) => {
  const result = await db.query(
    'SELECT * FROM research_responses WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

// ❌ BAD: String concatenation (vulnerable to SQL injection)
// const getResponseById = async (id) => {
//   const result = await db.query(
//     `SELECT * FROM research_responses WHERE id = '${id}'`
//   );
//   return result.rows[0];
// };

// ✅ GOOD: Using query builder with parameterization
const searchResponses = async (filters) => {
  const conditions = [];
  const values = [];
  let paramCount = 1;

  if (filters.phoneNumber) {
    conditions.push(`phone_number = $${paramCount++}`);
    values.push(filters.phoneNumber);
  }

  if (filters.startDate) {
    conditions.push(`created_at >= $${paramCount++}`);
    values.push(filters.startDate);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  const query = `SELECT * FROM research_responses ${whereClause}`;
  const result = await db.query(query, values);
  
  return result.rows;
};
```

### XSS Protection

```javascript
const helmet = require('helmet');
const xss = require('xss');

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// XSS sanitization
const sanitizeInput = (input) => {
  return xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

// Usage
app.post('/api/responses', (req, res) => {
  const sanitizedText = sanitizeInput(req.body.responseText);
  // Process sanitized input
});
```

---

## 🚦 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis for distributed rate limiting
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  })
});

// USSD callback rate limit (higher limit)
const ussdLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  keyGenerator: (req) => req.body.phoneNumber || req.ip,
  skip: (req) => req.body.serviceCode !== process.env.USSD_CODE
});

// Voice callback rate limit
const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.body.phoneNumber || req.ip
});

// Authentication rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/ussd', ussdLimiter);
app.use('/voice', voiceLimiter);
app.use('/auth/login', authLimiter);
```

---

## 📝 Audit Logging

```javascript
class AuditLogger {
  async log(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      userId: event.userId,
      username: event.username,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      success: event.success,
      errorMessage: event.error,
      metadata: event.metadata
    };

    // Log to database
    await db.query(`
      INSERT INTO audit_logs (
        event_type, user_id, action, resource, resource_id,
        ip_address, user_agent, success, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      auditEntry.eventType,
      auditEntry.userId,
      auditEntry.action,
      auditEntry.resource,
      auditEntry.resourceId,
      auditEntry.ipAddress,
      auditEntry.userAgent,
      auditEntry.success,
      auditEntry.errorMessage,
      JSON.stringify(auditEntry.metadata)
    ]);

    // Also log to file for redundancy
    logger.audit(auditEntry);
  }
}

// Audit middleware
const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      auditLogger.log({
        type: 'api_access',
        userId: req.user?.id,
        username: req.user?.username,
        action: action,
        resource: resource,
        resourceId: req.params.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        success: res.statusCode < 400,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Usage
app.get('/api/responses/:id', 
  authenticate,
  auditMiddleware('read', 'response'),
  getResponse
);

app.delete('/api/responses/:id',
  authenticate,
  requirePermission('responses:delete'),
  auditMiddleware('delete', 'response'),
  deleteResponse
);
```

---

## 🔍 Security Monitoring

### Real-Time Alerts

```javascript
class SecurityMonitor {
  constructor() {
    this.thresholds = {
      failedLogins: 5,
      rateLimitViolations: 10,
      suspiciousPatterns: 3
    };
  }

  async checkFailedLogins(userId, timeWindow = 15 * 60 * 1000) {
    const since = new Date(Date.now() - timeWindow);
    
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1
        AND action = 'login'
        AND success = false
        AND timestamp > $2
    `, [userId, since]);

    const count = parseInt(result.rows[0].count);
    
    if (count >= this.thresholds.failedLogins) {
      await this.sendAlert({
        type: 'failed_logins',
        severity: 'high',
        userId: userId,
        count: count,
        message: `${count} failed login attempts in ${timeWindow/60000} minutes`
      });
      
      // Lock account
      await this.lockAccount(userId);
    }
  }

  async detectSuspiciousActivity(req) {
    const patterns = [
      // SQL injection attempts
      /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b)/i,
      
      // XSS attempts
      /<script|javascript:|onerror=/i,
      
      // Path traversal
      /\.\.[\/\\]/,
      
      // Command injection
      /[;&|`$()]/
    ];

    const suspicious = patterns.some(pattern => 
      pattern.test(JSON.stringify(req.body)) ||
      pattern.test(JSON.stringify(req.query)) ||
      pattern.test(req.path)
    );

    if (suspicious) {
      await this.sendAlert({
        type: 'suspicious_activity',
        severity: 'critical',
        ip: req.ip,
        path: req.path,
        body: req.body,
        message: 'Potential attack detected'
      });
      
      // Block IP temporarily
      await this.blockIP(req.ip, 3600); // 1 hour
    }

    return suspicious;
  }

  async sendAlert(alert) {
    // Log alert
    logger.security(alert);
    
    // Send to monitoring service (e.g., Slack, PagerDuty)
    // await notificationService.send(alert);
    
    // Store in database
    await db.query(`
      INSERT INTO security_alerts (type, severity, details)
      VALUES ($1, $2, $3)
    `, [alert.type, alert.severity, JSON.stringify(alert)]);
  }
}

// Security middleware
app.use(async (req, res, next) => {
  const suspicious = await securityMonitor.detectSuspiciousActivity(req);
  
  if (suspicious) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Suspicious activity detected'
    });
  }
  
  next();
});
```

---

## ✅ Security Checklist

### Application Security
- [x] HTTPS/TLS 1.3 encryption
- [x] JWT authentication with secure tokens
- [x] Role-based access control (RBAC)
- [x] Password hashing with bcrypt (12 rounds)
- [x] Input validation and sanitization
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection (Helmet.js, CSP)
- [x] CSRF protection
- [x] Rate limiting (per endpoint)
- [x] Security headers (Helmet.js)

### Data Security
- [x] Encryption at rest (AES-256-GCM)
- [x] Encryption in transit (TLS 1.3)
- [x] PII anonymization
- [x] Data minimization
- [x] Secure data retention policies
- [x] Automatic data deletion
- [x] Audit logging

### Infrastructure Security
- [x] Firewall configuration
- [x] DDoS protection
- [x] Regular security updates
- [x] Secure credential management (Google Secret Manager)
- [x] Network segmentation
- [x] Backup encryption

### Monitoring & Response
- [x] Real-time security monitoring
- [x] Automated alerting
- [x] Incident response plan
- [x] Regular security audits
- [x] Vulnerability scanning
- [x] Penetration testing (quarterly)

### Compliance
- [x] GDPR compliance
- [x] Data protection impact assessment (DPIA)
- [x] Privacy policy
- [x] Terms of service
- [x] Consent management
- [x] Right to access
- [x] Right to deletion
- [x] Data portability

---

## 🚨 Incident Response

### Response Plan

1. **Detection:** Automated monitoring and alerts
2. **Containment:** Isolate affected systems
3. **Investigation:** Analyze logs and audit trails
4. **Eradication:** Remove threat and patch vulnerabilities
5. **Recovery:** Restore services and data
6. **Post-Incident:** Review and improve security measures

### Contact Information

- **Security Team:** security@research-system.com
- **Emergency:** +254-XXX-XXXXXX
- **Incident Reporting:** https://security.research-system.com/report

---

## 📚 Security Best Practices

### For Developers

1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Validate all inputs** before processing
4. **Use parameterized queries** for database access
5. **Keep dependencies updated** (npm audit)
6. **Follow principle of least privilege**
7. **Log security events** comprehensively
8. **Test security features** regularly

### For Administrators

1. **Rotate credentials** regularly (90 days)
2. **Monitor security alerts** daily
3. **Review audit logs** weekly
4. **Update systems** promptly
5. **Backup data** regularly
6. **Test disaster recovery** quarterly
7. **Conduct security training** for team
8. **Perform security audits** annually

---

## 📖 References

1. OWASP Top 10 Security Risks
2. NIST Cybersecurity Framework
3. GDPR Compliance Guidelines
4. Google Cloud Security Best Practices
5. Node.js Security Best Practices
6. JWT Security Best Practices

---

**Last Updated:** February 6, 2026  
**Version:** 1.0  
**Maintained by:** Security Team
