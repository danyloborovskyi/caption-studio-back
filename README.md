# Caption Studio Backend

A minimal Express.js backend server for Caption Studio application.

## Features

- Express.js web server
- CORS support for frontend integration
- Environment variable configuration
- Basic health check endpoints

## Tech Stack

- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd caption-studio-back
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.template .env
```

4. Configure your `.env` file:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
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

## Available Endpoints

- `GET /` - Basic server info
- `GET /health` - Health check endpoint

## Project Structure

```
caption-studio-back/
├── .env.template    # Environment variables template
├── .gitignore       # Git ignore rules
├── package.json     # Project dependencies
├── server.js        # Main server file
└── README.md        # This file
```

## Environment Variables

| Variable       | Description                          | Default               |
| -------------- | ------------------------------------ | --------------------- |
| `NODE_ENV`     | Environment (development/production) | development           |
| `PORT`         | Server port                          | 3000                  |
| `FRONTEND_URL` | Frontend URL for CORS                | http://localhost:3000 |

## Usage

Once the server is running, you can test it:

```bash
# Check server status
curl http://localhost:3000

# Health check
curl http://localhost:3000/health
```

## License

ISC
