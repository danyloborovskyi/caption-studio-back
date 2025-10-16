# Caption Studio Backend

A robust Express.js backend server for the Caption Studio application, featuring image upload, AI analysis, and comprehensive file management.

## Features

### Core Functionality

- **Image Upload & Storage** - Upload images to Supabase Storage with metadata tracking
- **AI Image Analysis** - OpenAI Vision (GPT-4o-mini) for automatic description and tag generation
- **Bulk Processing** - Upload and analyze up to 3 images simultaneously
- **File Management** - Comprehensive CRUD operations for uploaded files
- **Search & Filtering** - Advanced capabilities to find and organize files

### Technical Features

- **RESTful API** - Clean, organized endpoint structure
- **Error Handling** - Comprehensive error handling with proper HTTP status codes
- **Environment Configuration** - Secure management of sensitive data
- **CORS Support** - Seamless frontend integration
- **Health Monitoring** - Endpoints for server and service status checks

## Tech Stack

### Backend Framework

- **Express.js** - Web framework for the backend.
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
- **nodemon** - Development server auto-restart

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- A Supabase project
- An OpenAI API key

## Installation

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

Edit your `.env` file with your credentials:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

OPENAI_API_KEY=your_openai_api_key_here
```

### 5. Database Setup

Create the following table in your Supabase database:

```sql
CREATE TABLE public.uploaded_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  public_url text NOT NULL,
  description text,
  tags text[],
  status text DEFAULT 'uploaded'::text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example - adjust as needed)
CREATE POLICY "Allow public read access" ON public.uploaded_files FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert access" ON public.uploaded_files FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.uploaded_files FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access" ON public.uploaded_files FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket (or via Supabase Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true);

-- Set up storage policies (example - adjust as needed)
CREATE POLICY "Allow public access to uploaded files" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated file deletion" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');
```

## Getting Started

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

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
├── config/            # Supabase client configuration
├── routes/            # API route definitions
│   ├── files.js       # File retrieval and management routes
│   ├── upload.js      # Image upload and AI analysis routes
│   └── test.js        # Supabase connection and storage test routes
├── .env.template      # Environment variables template
├── .gitignore         # Git ignore rules
├── package.json       # Project dependencies
├── server.js          # Main Express server file
└── README.md          # Project documentation
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
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/your/image.jpg"
```

### Bulk Image Upload + Analysis

```bash
curl -X POST http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Content-Type: multipart/form-data" \
  -F "images=@/path/to/image1.png" \
  -F "images=@/path/to/image2.jpeg" \
  -F "images=@/path/to/image3.webp"
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
  -d '{"ids": ["file-id-1", "file-id-2"]}'
```

## 📊 Response Formats

### Successful Upload Response

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": "uuid-of-uploaded-file",
    "filename": "your-image.jpg",
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
  "message": "Processed 2 of 2 images",
  "data": {
    "successful_uploads": 2,
    "total_attempts": 2,
    "results": [
      {
        "id": "uuid-1",
        "filename": "image1.jpg",
        "description": "AI description 1",
        "tags": ["tag1", "tag2"],
        "status": "completed",
        "publicUrl": "..."
      },
      {
        "id": "uuid-2",
        "filename": "image2.jpg",
        "description": "AI description 2",
        "tags": ["tagA", "tagB"],
        "status": "completed",
        "publicUrl": "..."
      }
    ],
    "errors": []
  }
}
```

### File Listing Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "filename": "image1.jpg",
      "file_path": "images/image1.jpg",
      "file_size": 1024000,
      "mime_type": "image/jpeg",
      "public_url": "...",
      "description": "...",
      "tags": ["..."],
      "status": "completed",
      "uploaded_at": "...",
      "updated_at": "...",
      "file_size_mb": "0.98",
      "has_ai_analysis": true,
      "is_image": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false,
    "next_page": null,
    "prev_page": null
  },
  "filters": {
    "status": "all",
    "sort_by": "uploaded_at",
    "sort_order": "desc"
  },
  "summary": {
    "total_files": 1,
    "page_count": 1,
    "files_with_ai": 1,
    "image_files": 1
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "More specific error details"
}
```

## 🖼️ Supported Image Formats (OpenAI Vision Compatible)

- **PNG** (.png)
- **JPEG/JPG** (.jpg, .jpeg)
- **GIF** (.gif)
- **WebP** (.webp)

## 📏 File Size Limits

- **Maximum file size**: 5MB per image
- **Bulk upload limit**: 3 images per request

## 🩺 Health Checks

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

### Create Uploads Bucket (if not exists)

```bash
curl -X POST http://localhost:3000/api/test/create-bucket
```

## 🚀 Development & Deployment

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

### Production Build

```bash
npm start
```

### Environment Setup

Ensure all environment variables are properly configured for production:

- Set `NODE_ENV=production`
- Configure production Supabase credentials
- Ensure `SUPABASE_SERVICE_KEY` is secure and only used server-side

## 📞 Support

For support and questions, please open an issue in the repository.
