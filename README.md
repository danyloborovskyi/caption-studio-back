# Caption Studio Backend

A comprehensive Express.js backend server for the Caption Studio application, featuring **authentication**, **AI-powered image analysis**, **bulk operations**, and **real-time progress tracking**.

## ✨ Features

### 🔐 Authentication & User Management

- **Complete Auth System** - Signup, login, logout, password reset, token refresh
- **User Profiles** - First name, last name, avatar management
- **Secure Sessions** - JWT-based authentication with Supabase Auth
- **Row-Level Security** - Database policies ensure data isolation per user

### 🖼️ Image Management

- **Upload & Storage** - Store images in Supabase Storage with metadata tracking
- **AI Analysis** - OpenAI Vision (GPT-4o-mini) for automatic descriptions and tags
- **Tag Styles** - Choose between neutral, playful, or SEO-optimized tags
- **Bulk Upload** - Upload and analyze up to 10 images simultaneously with parallel processing
- **Real-time Progress** - Server-Sent Events (SSE) for live upload progress

### ⚡ Bulk Operations

- **Bulk Update** - Update filename, description, tags for up to 50 files at once
- **Bulk Delete** - Delete up to 100 files simultaneously
- **Bulk Regenerate** - Regenerate AI analysis for up to 20 images with style selection
- **Parallel Processing** - All bulk operations processed concurrently for maximum speed

### 📁 File Operations

- **CRUD Operations** - Create, read, update, delete files
- **Search & Filter** - Advanced search across filename, description, and tags
- **Pagination** - Efficient data retrieval for large collections
- **Statistics** - File counts, storage usage, and analytics

### 🎨 AI Tag Styles

- **Neutral** - Professional, descriptive tags
- **Playful** - Fun, creative, engaging tags
- **SEO** - Search-optimized, keyword-rich tags

## 🛠️ Tech Stack

### Core Technologies

- **Express.js** - Web framework
- **Node.js** - Runtime environment (v16+)
- **Supabase** - Backend-as-a-Service (database, storage, auth)
- **PostgreSQL** - Database (via Supabase)

### AI & Analysis

- **OpenAI API** - GPT-4o-mini for image analysis
- **OpenAI Vision** - Image description and tag generation

### File Processing

- **Multer** - Multipart/form-data handling
- **Server-Sent Events** - Real-time progress tracking

### Development

- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **nodemon** - Development server auto-restart

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- A Supabase project
- An OpenAI API key

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd caption-studio-back
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp env.template .env
```

### 4. Configure Environment Variables

Edit your `.env` file:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

OPENAI_API_KEY=your_openai_api_key_here
```

### 5. Database Setup

See `SUPABASE_SETUP.md` and `database/` folder for complete setup instructions including:

- Database schema with `user_id` column
- Row-Level Security (RLS) policies
- Storage bucket configuration
- Avatar storage setup

## 🏃 Getting Started

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Endpoints

### Authentication

| Method | Endpoint                    | Description                     |
| ------ | --------------------------- | ------------------------------- |
| POST   | `/api/auth/signup`          | Register new user               |
| POST   | `/api/auth/login`           | Login user                      |
| POST   | `/api/auth/logout`          | Logout user                     |
| POST   | `/api/auth/refresh`         | Refresh access token            |
| POST   | `/api/auth/forgot-password` | Request password reset          |
| POST   | `/api/auth/reset-password`  | Reset password with token       |
| POST   | `/api/auth/update-password` | Update password (authenticated) |

### User Profile

| Method | Endpoint                   | Description          |
| ------ | -------------------------- | -------------------- |
| GET    | `/api/user/profile`        | Get user profile     |
| POST   | `/api/user/update-profile` | Update name fields   |
| POST   | `/api/user/avatar`         | Upload/update avatar |
| DELETE | `/api/user/avatar`         | Delete avatar        |

### Upload Operations

| Method | Endpoint                              | Description                          |
| ------ | ------------------------------------- | ------------------------------------ |
| POST   | `/api/upload/image`                   | Upload single image                  |
| POST   | `/api/upload/upload-and-analyze`      | Upload + AI analysis (single)        |
| POST   | `/api/upload/bulk-upload-and-analyze` | Bulk upload + AI analysis (up to 10) |
| POST   | `/api/upload/analyze/:id`             | Analyze existing image               |
| POST   | `/api/upload/bulk-analyze`            | Bulk analyze existing images         |
| GET    | `/api/upload/progress/:uploadId`      | SSE stream for upload progress       |

### File Management

| Method | Endpoint                    | Description                            |
| ------ | --------------------------- | -------------------------------------- |
| GET    | `/api/files/`               | List all user files (paginated)        |
| GET    | `/api/files/:id`            | Get single file by ID                  |
| GET    | `/api/files/images`         | List images only                       |
| GET    | `/api/files/stats`          | File statistics                        |
| GET    | `/api/files/search`         | Search files                           |
| PATCH  | `/api/files/:id`            | Update file metadata                   |
| DELETE | `/api/files/:id`            | Delete single file                     |
| POST   | `/api/files/:id/regenerate` | Regenerate AI analysis for single file |

### Bulk Operations

| Method | Endpoint                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| PATCH  | `/api/files`            | Bulk update (up to 50 files)        |
| DELETE | `/api/files`            | Bulk delete (up to 100 files)       |
| POST   | `/api/files/regenerate` | Bulk regenerate AI (up to 20 files) |

### System Health

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/`                         | Basic server info        |
| GET    | `/health`                   | Health check             |
| GET    | `/api/test/test-connection` | Supabase connection test |
| GET    | `/api/test/test-storage`    | Storage access test      |

## 📁 Project Structure

```
caption-studio-back/
├── config/                    # Supabase client configuration
├── database/                  # SQL setup scripts
│   ├── add-user-isolation.sql
│   ├── storage-policies.sql
│   └── avatar-storage-setup.sql
├── docs/                      # Feature documentation
├── examples/                  # Frontend implementation examples
├── middleware/                # Express middleware
│   └── auth.js                # Authentication middleware
├── routes/                    # API route definitions
│   ├── auth.js                # Authentication routes
│   ├── user.js                # User profile routes
│   ├── files.js               # File management routes
│   ├── upload.js              # Upload and AI analysis routes
│   └── test.js                # Health check routes
├── utils/                     # Utility functions
│   └── progressTracker.js    # SSE progress tracking
├── .env.template              # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Project dependencies
├── server.js                  # Main Express server
└── README.md                  # This file
```

## 🔐 Environment Variables

| Variable               | Description               | Required | Default               |
| ---------------------- | ------------------------- | -------- | --------------------- |
| `NODE_ENV`             | Environment mode          | No       | development           |
| `PORT`                 | Server port               | No       | 3000                  |
| `FRONTEND_URL`         | Frontend URL for CORS     | No       | http://localhost:3000 |
| `SUPABASE_URL`         | Supabase project URL      | Yes      | -                     |
| `SUPABASE_ANON_KEY`    | Supabase anonymous key    | Yes      | -                     |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes      | -                     |
| `OPENAI_API_KEY`       | OpenAI API key            | Yes      | -                     |

## 🧪 API Usage Examples

### Authentication

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Single Image Upload + Analysis

```bash
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "tagStyle=seo"
```

### Bulk Image Upload + Analysis with Progress

```bash
# Step 1: Start upload (returns uploadId)
curl -X POST http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  -F "tagStyle=neutral"

# Step 2: Connect to SSE stream for progress
curl -N http://localhost:3000/api/upload/progress/UPLOAD_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Bulk Update Files

```bash
curl -X PATCH http://localhost:3000/api/files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"id": 123, "filename": "new-name.jpg", "tags": ["updated", "tags"]},
      {"id": 124, "description": "New description"}
    ]
  }'
```

### Bulk Delete Files

```bash
curl -X DELETE http://localhost:3000/api/files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": [123, 124, 125]}'
```

### Bulk Regenerate AI Analysis

```bash
curl -X POST http://localhost:3000/api/files/regenerate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": [123, 124, 125], "tagStyle": "seo"}'
```

## 📊 Response Formats

All responses use **camelCase** for consistency:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": 123,
    "filename": "image.jpg",
    "publicUrl": "https://...",
    "description": "AI-generated description",
    "tags": ["tag1", "tag2", "tag3"],
    "status": "completed",
    "uploadedAt": "2025-10-20T12:00:00Z",
    "updatedAt": "2025-10-20T12:00:00Z",
    "fileSizeMb": "2.34",
    "hasAiAnalysis": true,
    "isImage": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "More specific error details"
}
```

## 🖼️ Supported Image Formats

- **PNG** (.png)
- **JPEG/JPG** (.jpg, .jpeg)
- **GIF** (.gif)
- **WebP** (.webp)

## 📏 Limits

| Operation           | Limit     | Reason                       |
| ------------------- | --------- | ---------------------------- |
| Single image upload | 10MB      | Performance and storage      |
| Bulk upload         | 10 images | Parallel processing capacity |
| Bulk update         | 50 files  | Database performance         |
| Bulk delete         | 100 files | Storage cleanup efficiency   |
| Bulk regenerate     | 20 images | OpenAI API costs             |
| Avatar size         | 5MB       | Profile image optimization   |

## 🎨 AI Tag Styles

### Neutral (Professional)

```json
{
  "description": "A sunset over the ocean with warm colors",
  "tags": ["sunset", "ocean", "nature", "landscape", "sky"]
}
```

### Playful (Creative)

```json
{
  "description": "A breathtaking sunset painting the sky in golden hues! 🌅",
  "tags": [
    "golden hour magic",
    "ocean vibes",
    "sunset goals",
    "nature beauty",
    "scenic perfection"
  ]
}
```

### SEO (Search-Optimized)

```json
{
  "description": "A stunning ocean sunset with golden hour lighting and dramatic sky",
  "tags": [
    "sunset photography",
    "ocean view",
    "golden hour",
    "coastal scenery",
    "nature landscape"
  ]
}
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Row-Level Security** - Database policies ensure data isolation
- **Ownership Verification** - Users can only access their own files
- **Secure Password Handling** - Hashed passwords via Supabase Auth
- **CORS Protection** - Configurable allowed origins
- **Environment Variables** - Sensitive data not in code

## ⚡ Performance Features

- **Parallel Processing** - Bulk operations processed concurrently
- **Server-Sent Events** - Real-time progress without polling
- **Memory Storage** - Efficient file processing without disk I/O
- **Database Indexing** - Optimized queries with user_id indexes
- **CDN Integration** - Fast file delivery via Supabase Storage

## 📖 Documentation

- **SUPABASE_SETUP.md** - Complete database and storage setup
- **AUTH_SETUP.md** - Authentication system documentation
- **USER_SPECIFIC_DATA.md** - User data isolation guide
- **TAG_STYLES_FEATURE.md** - AI tag styles documentation
- **BULK_UPDATE_FEATURE.md** - Bulk update operations
- **BULK_DELETE_FEATURE.md** - Bulk delete operations
- **BULK_REGENERATE_FEATURE.md** - Bulk AI regeneration
- **PARALLEL_BULK_UPLOAD.md** - Real-time progress tracking

## 🩺 Health Checks

```bash
# Server health
curl http://localhost:3000/health

# Supabase connection
curl http://localhost:3000/api/test/test-connection

# Storage access
curl http://localhost:3000/api/test/test-storage
```

## 🚀 Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production Supabase credentials
3. Update `FRONTEND_URL` to production domain
4. Ensure all environment variables are set

### Production Checklist

- ✅ Supabase RLS policies configured
- ✅ Storage buckets created and configured
- ✅ OpenAI API key set with billing enabled
- ✅ CORS origins properly configured
- ✅ Database indexes created
- ✅ Service role key kept secure

## 🐛 Troubleshooting

### Upload Issues

- Verify Supabase storage bucket exists and is public
- Check RLS policies allow authenticated uploads
- Ensure file size within limits

### Authentication Issues

- Verify Supabase URL and keys are correct
- Check if email confirmation is required
- Ensure JWT token is passed in Authorization header

### AI Analysis Issues

- Verify OpenAI API key is valid and has credits
- Check image URL is publicly accessible
- Ensure image format is supported

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For support and questions, please:

- Check the documentation in the `docs/` folder
- Review example implementations in `examples/`
- Open an issue in the repository

## 📄 License

[Your License Here]

---

**Built with ❤️ using Express.js, Supabase, and OpenAI**
