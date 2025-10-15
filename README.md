# Caption Studio Backend

A comprehensive Express.js backend service for Caption Studio application with AI-powered image analysis, file management, and bulk processing capabilities.

## 🚀 Features

### Core Functionality

- **Image Upload & Storage** - Upload images to Supabase Storage with metadata tracking
- **AI Image Analysis** - OpenAI Vision (GPT-4o-mini) for automatic description and tag generation
- **Bulk Processing** - Upload and analyze up to 3 images simultaneously
- **File Management** - Complete CRUD operations for uploaded files
- **Search & Filtering** - Advanced file search with pagination and filtering

### Technical Features

- **RESTful API** - Clean, organized endpoint structure
- **Error Handling** - Comprehensive error handling with proper HTTP status codes
- **File Validation** - Support for PNG, JPEG, GIF, and WebP formats
- **Database Integration** - Supabase for data persistence and storage
- **CORS Support** - Cross-origin resource sharing for frontend integration
- **Environment Configuration** - Flexible environment-based configuration

## 🛠 Tech Stack

### Backend Framework

- **Express.js** - Web application framework
- **Node.js** - Runtime environment (v16+)

### AI & Machine Learning

- **OpenAI API** - GPT-4o-mini for image analysis
- **OpenAI Vision** - Image description and tag generation

### Database & Storage

- **Supabase** - Backend-as-a-Service for database and file storage
- **PostgreSQL** - Database (via Supabase)
- **Supabase Storage** - File storage with CDN

### File Processing

- **Multer** - Multipart/form-data handling for file uploads
- **Memory Storage** - Efficient file processing without disk I/O

### Development & Utilities

- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **nodemon** - Development auto-reload

## 📋 Prerequisites

- **Node.js** v16.0.0 or higher
- **npm** v8.0.0 or higher
- **Supabase Account** - For database and storage
- **OpenAI Account** - For AI image analysis

## 🔧 Installation

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
cp .env.template .env
```

### 4. Configure Environment Variables

Edit your `.env` file with your credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### 5. Database Setup

Create the following table in your Supabase database:

```sql
-- Create uploaded_files table
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    public_url TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'uploaded',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket (or via Supabase Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true);
```

## 🚀 Getting Started

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Upload Operations

| Method | Endpoint                              | Description                         |
| ------ | ------------------------------------- | ----------------------------------- |
| `POST` | `/api/upload/image`                   | Upload single image                 |
| `POST` | `/api/upload/upload-and-analyze`      | Upload + AI analysis (single)       |
| `POST` | `/api/upload/bulk-upload-and-analyze` | Bulk upload + AI analysis (up to 3) |
| `POST` | `/api/upload/analyze/:id`             | Analyze existing image              |
| `POST` | `/api/upload/bulk-analyze`            | Bulk analyze existing images        |

### File Management

| Method   | Endpoint            | Description                      |
| -------- | ------------------- | -------------------------------- |
| `GET`    | `/api/files/`       | List all files (with pagination) |
| `GET`    | `/api/files/:id`    | Get single file by ID            |
| `GET`    | `/api/files/images` | List images only                 |
| `GET`    | `/api/files/stats`  | File statistics                  |
| `GET`    | `/api/files/search` | Search files                     |
| `DELETE` | `/api/files/:id`    | Delete file                      |

### System Health

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| `GET`  | `/`                         | Basic server info        |
| `GET`  | `/health`                   | Health check             |
| `GET`  | `/api/test/test-connection` | Supabase connection test |
| `GET`  | `/api/test/test-storage`    | Storage access test      |

## 📁 Project Structure

```
caption-studio-back/
├── routes/
│   ├── upload.js        # Upload and AI analysis routes
│   ├── files.js         # File management routes
│   └── test.js          # Testing and health check routes
├── .env.template        # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Project dependencies
├── server.js           # Main server file
└── README.md           # This documentation
```

## 🔐 Environment Variables

| Variable               | Description            | Required | Default               |
| ---------------------- | ---------------------- | -------- | --------------------- |
| `NODE_ENV`             | Environment mode       | No       | development           |
| `PORT`                 | Server port            | No       | 3000                  |
| `FRONTEND_URL`         | Frontend URL for CORS  | No       | http://localhost:3000 |
| `SUPABASE_URL`         | Supabase project URL   | Yes      | -                     |
| `SUPABASE_ANON_KEY`    | Supabase anonymous key | Yes      | -                     |
| `SUPABASE_SERVICE_KEY` | Supabase service key   | Yes      | -                     |
| `OPENAI_API_KEY`       | OpenAI API key         | Yes      | -                     |

## 🧪 API Usage Examples

### Single Image Upload + Analysis

```bash
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -F "image=@/path/to/image.jpg"
```

### Bulk Image Upload + Analysis

```bash
curl -X POST http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg"
```

### List Files with Pagination

```bash
curl "http://localhost:3000/api/files/?page=1&limit=10&status=completed"
```

### Search Files

```bash
curl "http://localhost:3000/api/files/search?q=vacation&type=image"
```

### Bulk Analysis of Existing Images

```bash
curl -X POST http://localhost:3000/api/upload/bulk-analyze \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3]}'
```

## 📊 Response Formats

### Successful Upload Response

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": 1,
    "filename": "vacation-photo.jpg",
    "publicUrl": "https://...supabase.co/.../image_123.jpg",
    "description": "A stunning beach sunset with golden sand and turquoise water.",
    "tags": [
      "beach",
      "sunset",
      "ocean",
      "vacation",
      "tropical",
      "paradise",
      "golden",
      "turquoise",
      "sand",
      "water"
    ],
    "status": "completed",
    "uploadedAt": "2025-10-12T17:30:00Z"
  }
}
```

### Bulk Upload Response

```json
{
  "success": true,
  "message": "Processed 3 of 3 images",
  "data": {
    "successful_uploads": 3,
    "total_attempts": 3,
    "results": [...],
    "errors": []
  }
}
```

### File Listing Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next_page": true
  },
  "summary": {
    "total_files": 150,
    "files_with_ai": 140,
    "image_files": 145
  }
}
```

## 🚨 Error Handling

The API uses standard HTTP status codes:

- **200 OK** - Successful operation
- **201 Created** - Resource created successfully
- **207 Multi-Status** - Partial success (bulk operations)
- **400 Bad Request** - Invalid request data
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

## 🔍 Supported File Formats

### Images (OpenAI Vision Compatible)

- **PNG** (.png)
- **JPEG/JPG** (.jpg, .jpeg)
- **GIF** (.gif)
- **WebP** (.webp)

### File Size Limits

- **Maximum file size**: 5MB per image
- **Bulk upload limit**: 3 images per request

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Supabase Connection Test

```bash
curl http://localhost:3000/api/test/test-connection
```

### Storage Access Test

```bash
curl http://localhost:3000/api/test/test-storage
```

## 🔧 Development

### Start Development Server

```bash
npm run dev
```

### File Watching

The development server uses `nodemon` for automatic restart on file changes.

### Debugging

Enable detailed logging by setting:

```env
NODE_ENV=development
```

## 🚀 Deployment

### Production Build

```bash
npm start
```

### Environment Setup

Ensure all environment variables are properly configured for production:

- Set `NODE_ENV=production`
- Configure production Supabase credentials
- Set appropriate CORS origins

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please open an issue in the repository.
