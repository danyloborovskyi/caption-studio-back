# Caption Studio Backend - Architecture Diagrams

> **Visual guide to system architecture, request flows, and component interactions**  
> **Last Updated:** October 31, 2025

---

## 📊 Table of Contents

1. [System Overview](#system-overview)
2. [Layered Architecture](#layered-architecture)
3. [Authentication Flow](#authentication-flow)
4. [File Upload Flow](#file-upload-flow)
5. [Bulk Operations Flow](#bulk-operations-flow)
6. [Database Schema](#database-schema)
7. [Deployment Architecture](#deployment-architecture)
8. [Security Layers](#security-layers)

---

## 🏗️ System Overview

```mermaid
graph TB
    subgraph "Frontend Application"
        FE[React/Next.js Frontend<br/>Vercel Deployment]
    end

    subgraph "Backend Services - Caption Studio"
        API[Express.js API Server<br/>Node.js 18+]
        MW[Middleware Layer<br/>Auth, Rate Limit, CORS]
        CTRL[Controllers Layer<br/>HTTP Request Handlers]
        SVC[Services Layer<br/>Business Logic]
        REPO[Repositories Layer<br/>Data Access]
        MODEL[Models Layer<br/>Domain Entities]
    end

    subgraph "External Services"
        SB[(Supabase<br/>Auth + DB + Storage)]
        AI[OpenAI API<br/>GPT-4o-mini Vision]
    end

    subgraph "Infrastructure"
        RENDER[Render.com<br/>Hosting]
        GHA[GitHub Actions<br/>CI/CD Pipeline]
    end

    FE -->|HTTPS/REST API| API
    API --> MW
    MW --> CTRL
    CTRL --> SVC
    SVC --> REPO
    SVC --> AI
    REPO --> MODEL
    REPO --> SB
    
    GHA -->|Deploy| RENDER
    RENDER -->|Hosts| API
    
    style FE fill:#61dafb,stroke:#333,stroke-width:2px
    style API fill:#68a063,stroke:#333,stroke-width:2px
    style SB fill:#3ecf8e,stroke:#333,stroke-width:2px
    style AI fill:#10a37f,stroke:#333,stroke-width:2px
    style RENDER fill:#46e3b7,stroke:#333,stroke-width:2px
```

---

## 🎯 Layered Architecture (SOLID Principles)

```mermaid
graph TD
    subgraph "Presentation Layer"
        R1[Routes<br/>auth.js]
        R2[Routes<br/>user.js]
        R3[Routes<br/>upload.js]
        R4[Routes<br/>files.js]
        
        C1[AuthController]
        C2[UserController]
        C3[UploadController]
        C4[FilesController]
    end

    subgraph "Business Logic Layer"
        SC[ServiceContainer<br/>Dependency Injection]
        US[UploadService<br/>File Processing Logic]
        AI[OpenAIService<br/>Image Analysis]
        SP[SupabaseStorageProvider<br/>File Storage]
    end

    subgraph "Data Access Layer"
        FR[FileRepository<br/>Database Operations]
    end

    subgraph "Domain Layer"
        FM[File Model<br/>Business Entity]
    end

    subgraph "Cross-Cutting Concerns"
        AUTH[Auth Middleware]
        ERR[Error Handler]
        LOG[Logger]
        VAL[File Validator]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4
    
    C1 --> AUTH
    C2 --> AUTH
    C3 --> AUTH
    C4 --> AUTH
    
    C3 --> SC
    C4 --> SC
    
    SC --> US
    SC --> AI
    SC --> SP
    
    US --> FR
    SP --> FR
    
    FR --> FM
    
    AUTH --> ERR
    US --> ERR
    US --> LOG
    US --> VAL
    
    style SC fill:#ffd700,stroke:#333,stroke-width:2px
    style AUTH fill:#ff6b6b,stroke:#333,stroke-width:2px
    style ERR fill:#ff6b6b,stroke:#333,stroke-width:2px
    style FM fill:#4ecdc4,stroke:#333,stroke-width:2px
```

### **Layer Responsibilities**

| Layer | Purpose | Examples | Dependencies |
|-------|---------|----------|--------------|
| **Routes** | Define API endpoints | `POST /api/auth/login` | Controllers |
| **Controllers** | Handle HTTP requests/responses | `AuthController.login()` | Services, Middleware |
| **Services** | Business logic and orchestration | `UploadService.processUpload()` | Repositories, External APIs |
| **Repositories** | Database operations | `FileRepository.findById()` | Models, Database |
| **Models** | Domain entities and validation | `File.isImage()` | None |

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express API
    participant MW as Auth Middleware
    participant AC as AuthController
    participant SB as Supabase Auth

    Note over FE,SB: User Login Flow
    
    FE->>API: POST /api/auth/login<br/>{email, password}
    API->>AC: Route to AuthController.login()
    AC->>SB: signInWithPassword()
    
    alt Login Success
        SB-->>AC: {user, session}<br/>accessToken, refreshToken
        AC-->>API: 200 OK<br/>{user, session}
        API-->>FE: User + Tokens
        Note over FE: Store tokens in localStorage
    else Login Failure
        SB-->>AC: {error}
        AC-->>API: 401 Unauthorized
        API-->>FE: Error message
    end
    
    Note over FE,SB: Authenticated Request Flow
    
    FE->>API: GET /api/files<br/>Authorization: Bearer {token}
    API->>MW: authenticateUser()
    MW->>SB: getUser(token)
    
    alt Valid Token
        SB-->>MW: {user}
        MW->>MW: Attach user to req.user
        MW-->>API: next()
        API->>API: Process request
        API-->>FE: 200 OK + Data
    else Invalid Token
        SB-->>MW: {error}
        MW-->>FE: 401 Unauthorized
    end
    
    Note over FE,SB: Token Refresh Flow
    
    FE->>API: POST /api/auth/refresh<br/>{refreshToken}
    API->>AC: AuthController.refresh()
    AC->>SB: refreshSession(refreshToken)
    SB-->>AC: {session}<br/>NEW accessToken + refreshToken
    AC-->>FE: New tokens
    Note over FE: Update stored tokens
```

---

## 📤 File Upload & Analysis Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express API
    participant UC as UploadController
    participant US as UploadService
    participant VAL as File Validator
    participant SP as Storage Provider
    participant AI as OpenAI Service
    participant FR as File Repository
    participant SB as Supabase Storage

    Note over FE,SB: Single File Upload + Analysis
    
    FE->>API: POST /api/upload/upload-and-analyze<br/>multipart/form-data<br/>image file + tagStyle
    API->>UC: Route to UploadController
    
    UC->>VAL: validateFileExtension()
    VAL-->>UC: ✓ Valid
    
    UC->>VAL: validateFileSize()
    VAL-->>UC: ✓ Under 10MB
    
    UC->>US: processUpload(file, userId, tagStyle)
    
    US->>VAL: sanitizeFilename()
    VAL-->>US: Clean filename
    
    US->>SP: uploadFile(file, path)
    SP->>SB: storage.upload()
    SB-->>SP: {path}
    SP->>SB: getPublicUrl()
    SB-->>SP: {publicUrl}
    SP-->>US: {storagePath, publicUrl}
    
    US->>FR: createFile(metadata)
    FR->>SB: INSERT INTO uploaded_files
    SB-->>FR: {fileRecord}
    FR-->>US: File entity
    
    US->>AI: analyzeImage(publicUrl, tagStyle)
    Note over AI: OpenAI Vision API<br/>GPT-4o-mini
    AI-->>US: {description, tags}
    
    US->>FR: updateFile(id, aiData)
    FR->>SB: UPDATE uploaded_files
    SB-->>FR: {updatedRecord}
    
    US-->>UC: {file, analysis}
    UC-->>FE: 200 OK<br/>{file, description, tags}
    
    Note over FE: Display image + AI analysis
```

---

## 🔄 Bulk Upload Flow (Up to 10 Files)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express API
    participant UC as UploadController
    participant US as UploadService
    participant AI as OpenAI Service
    
    Note over FE,AI: Bulk Upload with Parallel Processing
    
    FE->>API: POST /api/upload/bulk-upload-and-analyze<br/>10 image files + tagStyle
    API->>UC: Route to UploadController
    
    UC->>UC: Validate file count (max 10)
    UC->>UC: Generate uploadId
    
    loop For each file (parallel)
        UC->>US: processUpload(file)
        US->>US: Upload to storage
        US->>US: Save to database
        US->>AI: analyzeImage()
        AI-->>US: {description, tags}
        US->>US: Update with AI data
        US-->>UC: File result
        UC->>UC: Update progress
    end
    
    UC-->>FE: 200 OK<br/>{results: [...], uploadId}
    
    Note over FE: Optional: Connect to SSE for progress
    
    FE->>API: GET /api/upload/progress/{uploadId}
    API-->>FE: Server-Sent Events<br/>Real-time progress updates
```

---

## 💾 Database Schema (Supabase PostgreSQL)

```mermaid
erDiagram
    USERS ||--o{ UPLOADED_FILES : owns
    USERS ||--o{ STORAGE_FILES : owns
    
    USERS {
        uuid id PK
        string email UK
        timestamp created_at
        timestamp updated_at
        timestamp last_sign_in_at
        jsonb user_metadata
        string avatar_url
    }
    
    UPLOADED_FILES {
        uuid id PK
        uuid user_id FK
        string filename
        string file_path
        string public_url
        string mime_type
        bigint file_size
        string description
        text[] tags
        string status
        timestamp uploaded_at
        timestamp updated_at
    }
    
    STORAGE_FILES {
        uuid id PK
        uuid user_id FK
        string bucket_id
        string name
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
```

### **Row-Level Security (RLS) Policies**

```sql
-- Users can only see their own files
CREATE POLICY "Users can view own files"
ON uploaded_files FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own files
CREATE POLICY "Users can insert own files"
ON uploaded_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own files
CREATE POLICY "Users can update own files"
ON uploaded_files FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON uploaded_files FOR DELETE
USING (auth.uid() = user_id);
```

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Developer Workflow"
        DEV[Developer<br/>Local Machine]
        GIT[GitHub Repository<br/>Main Branch]
    end
    
    subgraph "CI/CD Pipeline - GitHub Actions"
        T1[Test Job<br/>Node 18.x, 20.x, 22.x<br/>173 tests]
        T2[Security Scan<br/>npm audit<br/>Secret detection]
        T3[Build Check<br/>Server startup test]
        T4[Deploy Job<br/>Trigger Render webhook]
        T5[Health Check<br/>10 retries, 30s delay]
    end
    
    subgraph "Production Environment - Render"
        RENDER[Render.com<br/>Node.js Service]
        HEALTH[Health Endpoint<br/>/health]
    end
    
    subgraph "External Services"
        SB[(Supabase<br/>PostgreSQL + Storage)]
        AI[OpenAI API]
    end
    
    subgraph "Monitoring"
        MON[Health Check<br/>CI/CD]
        LOG[Application Logs<br/>Render Dashboard]
    end
    
    DEV -->|git push| GIT
    GIT -->|webhook| T1
    T1 -->|pass| T2
    T2 -->|pass| T3
    T3 -->|pass| T4
    T4 -->|POST webhook| RENDER
    RENDER -->|deploy| HEALTH
    T5 -->|verify| HEALTH
    
    RENDER --> SB
    RENDER --> AI
    
    HEALTH --> MON
    RENDER --> LOG
    
    style T1 fill:#90EE90,stroke:#333,stroke-width:2px
    style T2 fill:#90EE90,stroke:#333,stroke-width:2px
    style T3 fill:#90EE90,stroke:#333,stroke-width:2px
    style T4 fill:#FFD700,stroke:#333,stroke-width:2px
    style T5 fill:#87CEEB,stroke:#333,stroke-width:2px
    style RENDER fill:#46e3b7,stroke:#333,stroke-width:2px
```

### **Deployment Pipeline Flow**

```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes to main                               │
├─────────────────────────────────────────────────────────┤
│  ✅ Run 173 tests (3 Node versions in parallel)        │
├─────────────────────────────────────────────────────────┤
│  ✅ Security scan (npm audit, secret detection)        │
├─────────────────────────────────────────────────────────┤
│  ✅ Build verification (server starts successfully)    │
├─────────────────────────────────────────────────────────┤
│  🚀 Auto-deploy to Render (only if all pass)           │
├─────────────────────────────────────────────────────────┤
│  ⏳ Wait 60 seconds for deployment to start            │
├─────────────────────────────────────────────────────────┤
│  ✅ Health check with 10 retries (30s between)         │
├─────────────────────────────────────────────────────────┤
│  ✅ Deployment successful!                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Layers

```mermaid
graph TD
    REQ[Incoming Request]
    
    subgraph "Layer 1: Network Security"
        CORS[CORS Policy<br/>Environment-aware origins]
        HTTPS[HTTPS/TLS<br/>HSTS Headers]
    end
    
    subgraph "Layer 2: Rate Limiting"
        AUTH_LIMIT[Auth Endpoints<br/>10 req/15min]
        API_LIMIT[API Endpoints<br/>100 req/15min]
    end
    
    subgraph "Layer 3: Security Headers"
        HELMET[Helmet.js<br/>CSP, X-Frame-Options]
    end
    
    subgraph "Layer 4: Authentication"
        JWT[JWT Verification<br/>Supabase Auth]
        RLS[Row-Level Security<br/>Database Policies]
    end
    
    subgraph "Layer 5: Input Validation"
        SANITIZE[File Sanitization<br/>Path traversal prevention]
        VALIDATE[Input Validation<br/>Type, size, format checks]
    end
    
    subgraph "Layer 6: Authorization"
        OWNER[Ownership Check<br/>user_id validation]
        SCOPE[Resource Scope<br/>Access control]
    end
    
    subgraph "Layer 7: Cryptography"
        CRYPTO[Secure Random<br/>crypto.randomBytes()]
        HASH[Password Hashing<br/>Supabase bcrypt]
    end
    
    REQ --> CORS
    CORS --> HTTPS
    HTTPS --> AUTH_LIMIT
    AUTH_LIMIT --> API_LIMIT
    API_LIMIT --> HELMET
    HELMET --> JWT
    JWT --> RLS
    RLS --> SANITIZE
    SANITIZE --> VALIDATE
    VALIDATE --> OWNER
    OWNER --> SCOPE
    SCOPE --> CRYPTO
    CRYPTO --> HASH
    
    style CORS fill:#ff6b6b,stroke:#333,stroke-width:2px
    style JWT fill:#ffd700,stroke:#333,stroke-width:2px
    style RLS fill:#ffd700,stroke:#333,stroke-width:2px
    style SANITIZE fill:#90EE90,stroke:#333,stroke-width:2px
    style CRYPTO fill:#87CEEB,stroke:#333,stroke-width:2px
```

### **Security Features Matrix**

| Layer | Feature | Implementation | Status |
|-------|---------|----------------|--------|
| **Network** | CORS | Environment-aware origins | ✅ |
| **Network** | HTTPS | HSTS headers (1 year) | ✅ |
| **Rate Limit** | Auth endpoints | 10 req/15min | ✅ |
| **Rate Limit** | API endpoints | 100 req/15min | ✅ |
| **Headers** | CSP | Content Security Policy | ✅ |
| **Headers** | X-Frame-Options | DENY | ✅ |
| **Auth** | JWT | Supabase Auth | ✅ |
| **Auth** | Password Policy | 12+ chars, complexity | ✅ |
| **Database** | RLS Policies | User isolation | ✅ |
| **Database** | UUID IDs | Non-sequential | ✅ |
| **Input** | File Sanitization | Path traversal prevention | ✅ |
| **Input** | File Validation | Type, size, MIME checks | ✅ |
| **Crypto** | Secure Random | crypto.randomBytes() | ✅ |
| **Logging** | Security Events | Centralized logger | ✅ |

---

## 📊 Request Flow Examples

### **Authenticated File List Request**

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Middleware
    participant Controller
    participant Repository
    participant Database

    Client->>Server: GET /api/files?page=1&limit=20<br/>Authorization: Bearer {token}
    
    Server->>Middleware: Rate Limit Check
    Middleware-->>Server: ✓ Under limit
    
    Server->>Middleware: CORS Check
    Middleware-->>Server: ✓ Allowed origin
    
    Server->>Middleware: Auth Verification
    Middleware->>Database: Verify token with Supabase
    Database-->>Middleware: {user: {id, email}}
    Middleware->>Middleware: Attach req.user
    Middleware-->>Server: ✓ Authenticated
    
    Server->>Controller: FilesController.listFiles()
    Controller->>Repository: FileRepository.findAll(userId, pagination)
    Repository->>Database: SELECT * FROM uploaded_files<br/>WHERE user_id = $1<br/>LIMIT 20 OFFSET 0
    Database-->>Repository: [{file1}, {file2}, ...]
    Repository-->>Controller: [File, File, ...]
    Controller-->>Client: 200 OK<br/>{files: [...], pagination: {...}}
```

### **File Update Request**

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Middleware
    participant Controller
    participant Repository
    participant Database

    Client->>Server: PATCH /api/files/123<br/>{filename: "new.jpg", tags: [...]}
    
    Server->>Middleware: Authenticate
    Middleware-->>Server: ✓ User authenticated
    
    Server->>Controller: FilesController.updateFile()
    Controller->>Controller: Validate input
    Controller->>Controller: Sanitize filename
    
    Controller->>Repository: FileRepository.findById(123, userId)
    Repository->>Database: SELECT * FROM uploaded_files<br/>WHERE id = $1 AND user_id = $2
    
    alt File exists and owned by user
        Database-->>Repository: {file}
        Repository-->>Controller: File entity
        
        Controller->>Repository: FileRepository.update(123, data)
        Repository->>Database: UPDATE uploaded_files<br/>SET filename = $1, tags = $2<br/>WHERE id = $3 AND user_id = $4
        Database-->>Repository: {updatedFile}
        Repository-->>Controller: File entity
        Controller-->>Client: 200 OK<br/>{file: {...}}
    else File not found or not owned
        Database-->>Repository: null
        Repository-->>Controller: null
        Controller-->>Client: 404 Not Found
    end
```

---

## 🎨 Component Interaction Map

```mermaid
graph LR
    subgraph "External"
        FE[Frontend]
    end
    
    subgraph "API Gateway"
        RT[Routes]
        MW[Middleware]
    end
    
    subgraph "Application Core"
        CTL[Controllers]
        SVC[Services]
        REP[Repositories]
        MDL[Models]
    end
    
    subgraph "Infrastructure"
        SB[(Supabase)]
        AI[OpenAI]
    end
    
    subgraph "Utilities"
        ERR[Error Handler]
        LOG[Logger]
        VAL[Validators]
    end
    
    FE -->|HTTP/REST| RT
    RT --> MW
    MW --> CTL
    CTL --> SVC
    SVC --> REP
    SVC --> AI
    REP --> MDL
    REP --> SB
    
    CTL -.->|uses| ERR
    SVC -.->|uses| ERR
    SVC -.->|uses| LOG
    SVC -.->|uses| VAL
    MW -.->|uses| ERR
    
    style FE fill:#61dafb,stroke:#333,stroke-width:2px
    style SVC fill:#ffd700,stroke:#333,stroke-width:2px
    style SB fill:#3ecf8e,stroke:#333,stroke-width:2px
    style AI fill:#10a37f,stroke:#333,stroke-width:2px
```

---

## 📈 Performance Characteristics

### **API Response Times** (Average)

| Endpoint | Target | Actual | Notes |
|----------|--------|--------|-------|
| `GET /health` | < 50ms | ~10ms | No external calls |
| `POST /api/auth/login` | < 500ms | ~300ms | Supabase Auth |
| `GET /api/files` | < 200ms | ~150ms | Database query |
| `POST /api/upload/upload-and-analyze` | < 10s | ~8s | Includes AI analysis |
| `POST /api/upload/bulk-upload-and-analyze` | < 60s | ~45s | 10 files parallel |
| `POST /api/files/regenerate` (bulk) | < 40s | ~30s | 20 files parallel |

### **Scalability**

```mermaid
graph LR
    subgraph "Current Architecture"
        A1[Single Render Instance]
        A1 --> SB[(Supabase<br/>Auto-scales)]
        A1 --> AI[OpenAI<br/>Rate limited by plan]
    end
    
    subgraph "Future: Horizontal Scaling"
        LB[Load Balancer]
        I1[Instance 1]
        I2[Instance 2]
        I3[Instance N]
        
        LB --> I1
        LB --> I2
        LB --> I3
        
        I1 --> SB2[(Supabase)]
        I2 --> SB2
        I3 --> SB2
    end
    
    style A1 fill:#46e3b7,stroke:#333,stroke-width:2px
    style LB fill:#ffd700,stroke:#333,stroke-width:2px
```

---

## 🔄 Data Flow: File Upload to Download

```mermaid
graph TD
    START[User uploads image]
    
    UPLOAD[File sent to server<br/>multipart/form-data]
    VALIDATE[Validate file<br/>extension, size, MIME type]
    SANITIZE[Sanitize filename<br/>remove dangerous chars]
    
    STORAGE[Upload to Supabase Storage<br/>bucket: files/{userId}/]
    URL[Generate public URL<br/>signed URL, 1 year expiry]
    
    DB[Save metadata to database<br/>uploaded_files table]
    
    AI_CALL[Call OpenAI Vision API<br/>analyze image content]
    AI_RESULT[Receive description + tags]
    
    UPDATE[Update database<br/>add AI analysis]
    
    RESPONSE[Return to user<br/>file + analysis]
    
    DISPLAY[User views file in frontend]
    
    DOWNLOAD_REQ[User clicks download]
    FETCH[Backend fetches from Supabase]
    STREAM[Stream file to user]
    
    START --> UPLOAD
    UPLOAD --> VALIDATE
    VALIDATE --> SANITIZE
    SANITIZE --> STORAGE
    STORAGE --> URL
    URL --> DB
    DB --> AI_CALL
    AI_CALL --> AI_RESULT
    AI_RESULT --> UPDATE
    UPDATE --> RESPONSE
    RESPONSE --> DISPLAY
    DISPLAY --> DOWNLOAD_REQ
    DOWNLOAD_REQ --> FETCH
    FETCH --> STREAM
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style AI_CALL fill:#10a37f,stroke:#333,stroke-width:2px
    style STORAGE fill:#3ecf8e,stroke:#333,stroke-width:2px
    style STREAM fill:#87CEEB,stroke:#333,stroke-width:2px
```

---

## 📚 Technology Stack Summary

```mermaid
graph TB
    subgraph "Frontend Technologies"
        FE1[React/Next.js]
        FE2[TypeScript]
        FE3[Tailwind CSS]
    end
    
    subgraph "Backend Technologies"
        BE1[Node.js 18+]
        BE2[Express.js]
        BE3[CommonJS]
    end
    
    subgraph "Database & Storage"
        DB1[PostgreSQL via Supabase]
        DB2[Supabase Storage]
        DB3[Row-Level Security]
    end
    
    subgraph "AI & External APIs"
        AI1[OpenAI GPT-4o-mini]
        AI2[Vision API]
    end
    
    subgraph "Security"
        SEC1[Supabase Auth]
        SEC2[JWT Tokens]
        SEC3[Helmet.js]
        SEC4[express-rate-limit]
    end
    
    subgraph "DevOps & CI/CD"
        DEV1[GitHub Actions]
        DEV2[Render.com]
        DEV3[Jest Testing]
    end
    
    style FE1 fill:#61dafb,stroke:#333,stroke-width:2px
    style BE1 fill:#68a063,stroke:#333,stroke-width:2px
    style DB1 fill:#3ecf8e,stroke:#333,stroke-width:2px
    style AI1 fill:#10a37f,stroke:#333,stroke-width:2px
    style SEC1 fill:#ffd700,stroke:#333,stroke-width:2px
    style DEV1 fill:#2088ff,stroke:#333,stroke-width:2px
```

---

## 🎯 Key Design Patterns

| Pattern | Implementation | Benefit |
|---------|----------------|---------|
| **Layered Architecture** | Controllers → Services → Repositories → Models | Clear separation of concerns |
| **Repository Pattern** | FileRepository abstracts data access | Easy to swap database |
| **Dependency Injection** | ServiceContainer manages dependencies | Loose coupling, testable |
| **Factory Pattern** | ServiceContainer creates service instances | Centralized object creation |
| **Middleware Chain** | Express middleware pipeline | Reusable request processing |
| **Domain Model** | File entity with business logic | Rich domain objects |
| **Interface Segregation** | IAIService, IStorageProvider | Swap implementations easily |
| **Error Handling** | Centralized errorHandler middleware | Consistent error responses |
| **Async/Await** | All async operations use async/await | Cleaner async code |

---

## 📖 Related Documentation

- **[README.md](./README.md)** - Project overview, setup, and API reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Complete API endpoint reference
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database and storage setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide and checklist
- **[TOKEN_SECURITY_ANALYSIS.md](./TOKEN_SECURITY_ANALYSIS.md)** - Security analysis

---

**Last Updated:** October 31, 2025  
**Maintained By:** Backend Team  
**Version:** 1.0.0

