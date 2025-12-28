# Quickstart Guide: Wikipedia Podcast Generator

**Feature**: 001-wiki-podcast-app  
**Date**: 2025-12-22

## Prerequisites

Before starting, ensure you have:

- [ ] **Docker** installed (Docker Desktop 4.x or Docker Engine 24.x+)
- [ ] **Node.js 20 LTS** (for local development only)
- [ ] **xAI API Key** from [x.ai](https://x.ai) (for Grok model access)
- [ ] **ElevenLabs API Key** from [elevenlabs.io](https://elevenlabs.io)

## Quick Start (Docker)

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd audio_pod

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your preferred editor
```

### 2. Set Environment Variables

Edit `.env` with your API keys:

```bash
# Required API Keys
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# Optional Configuration
PORT=3000
OUTPUT_DIR=/app/output
```

### 3. Build and Run

```bash
# Build the Docker image
docker build -t wiki-podcast-generator .

# Run the container
docker run -d \
  --name wiki-podcast \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/output:/app/output \
  wiki-podcast-generator

# Check logs
docker logs -f wiki-podcast
```

### 4. Access the Application

Open your browser to: **http://localhost:3000**

---

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# From project root
cp .env.example .env
# Edit .env with your API keys
```

### 3. Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 5. Access Development Server

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:3000**

---

## First Podcast Generation

### Using the Web Interface

1. Open http://localhost:3000 in your browser
2. Enter a Wikipedia URL or article title:
   - URL: `https://en.wikipedia.org/wiki/Albert_Einstein`
   - Title: `Quantum Computing`
3. Click **Generate Podcast**
4. Watch the progress indicators:
   - 📥 Fetching article...
   - ✍️ Writing script...
   - 🎤 Generating voices...
   - ✅ Complete!
5. Play the podcast in-browser or download the MP3

### Using the API Directly

```bash
# Generate podcast from URL
curl -X POST http://localhost:3000/api/podcast \
  -H "Content-Type: application/json" \
  -d '{"input": "https://en.wikipedia.org/wiki/Albert_Einstein", "type": "url"}'

# Generate podcast from title
curl -X POST http://localhost:3000/api/podcast \
  -H "Content-Type: application/json" \
  -d '{"input": "Quantum Computing", "type": "title"}'

# Download generated audio
curl -O http://localhost:3000/api/podcast/{id}/audio
```

### Using SSE for Progress Updates

```bash
# Stream progress events
curl -N http://localhost:3000/api/podcast/stream \
  -H "Content-Type: application/json" \
  -d '{"input": "Albert Einstein", "type": "title"}'
```

---

## Project Structure

```
audio_pod/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express entry point
│   │   ├── routes/podcast.ts     # API routes
│   │   ├── services/             # Business logic
│   │   └── prompts/podcast.ts    # AI prompt template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main component
│   │   ├── components/           # React components
│   │   └── services/api.ts       # API client
│   └── package.json
├── output/                       # Generated files (gitignored)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XAI_API_KEY` | ✅ Yes | — | xAI Grok API key |
| `ELEVENLABS_API_KEY` | ✅ Yes | — | ElevenLabs TTS API key |
| `PORT` | No | `3000` | Server port |
| `OUTPUT_DIR` | No | `./output` | Directory for generated files |
| `NODE_ENV` | No | `development` | Environment mode |

---

## Validation Checklist

After setup, verify the following:

### Health Check
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"healthy","checks":{"ffmpeg":"ok","outputDir":"ok"}}
```

### Test Generation
1. Generate a test podcast using a short article
2. Verify audio plays in browser
3. Verify MP3 downloads correctly
4. Check output directory for artifacts:
   ```bash
   ls -la output/
   # Should contain: scripts/, audio/, metadata/
   ```

### Constitution Compliance
- [ ] Podcast contains exactly two speakers (Alex and Jordan)
- [ ] Audio duration is between 2-3 minutes
- [ ] Script follows 5-section structure
- [ ] Content matches source Wikipedia article

---

## Troubleshooting

### "FFmpeg not found" Error
```bash
# Verify FFmpeg installation
ffmpeg -version

# Docker: FFmpeg is pre-installed in container
# If missing, rebuild: docker build --no-cache -t wiki-podcast-generator .
```

### "API Key Invalid" Error
```bash
# Verify environment variables are set
echo $XAI_API_KEY
echo $ELEVENLABS_API_KEY

# Docker: Check container environment
docker exec wiki-podcast env | grep API_KEY
```

### "Article not found" Error
- Ensure the Wikipedia URL is for English Wikipedia (`en.wikipedia.org`)
- Verify the article title is spelled correctly
- Check if the article exists by visiting the URL in a browser

### Generation Timeout
- Long articles may take 60-90 seconds to process
- Check backend logs for progress: `docker logs wiki-podcast`
- Ensure stable internet connection for external API calls

---

## Next Steps

- Read the full [API Documentation](./contracts/api.yaml)
- Review the [Data Model](./data-model.md)
- Check [Research Decisions](./research.md)
- Run `/speckit.tasks` to generate implementation tasks

