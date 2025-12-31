# Wikipedia Podcast Generator 🎙️

Transform Wikipedia articles into engaging 2-3 minute audio podcasts featuring conversational discussions between AI hosts Nishi and Shyam.

## 🌟 Features

- **Flexible Input**: Accept Wikipedia URLs or article titles
- **AI-Powered Scripts**: Generate natural conversations using xAI Grok
- **High-Quality Audio**: Text-to-speech synthesis via ElevenLabs
- **Bilingual Conversations**: Natural English-Hindi code-switching
- **Real-Time Progress**: Track generation through 4 pipeline stages
- **In-Browser Playback**: Listen immediately or download MP3

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Install FFmpeg
brew install ffmpeg  # macOS
# or: sudo apt-get install ffmpeg  # Ubuntu/Debian

# Configure environment
cp env.example .env
# Edit .env with your API keys

# Start services (2 terminals)
cd backend && npm run dev    # Terminal 1: Backend (port 3000)
cd frontend && npm run dev   # Terminal 2: Frontend (port 5173)
```

## 📋 Prerequisites

- **Node.js** 20 LTS (for local development)
- **xAI API Key** - Get from [x.ai](https://x.ai)
- **ElevenLabs API Key** - Get from [elevenlabs.io](https://elevenlabs.io)

## 🏗️ System Architecture

```
User Input (URL/Title)
        ↓
[1] Fetch Wikipedia Article
        ↓
[2] Generate Script (xAI Grok)
        ↓
[3] Synthesize Audio (ElevenLabs)
        ↓
[4] Stitch Audio (FFmpeg)
        ↓
    Final MP3 Podcast
```

### Technology Stack

**Frontend**: React 18 + TypeScript + Tailwind CSS + Vite  
**Backend**: Node.js 20 + Express + TypeScript  
**AI Services**: xAI Grok (script generation) + ElevenLabs (TTS)  
**Audio Processing**: FFmpeg  
**Storage**: Filesystem (no database)

## 📁 Project Structure

```
audio_pod/
├── backend/              # Express API server
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Business logic
│   │   │   ├── wikipedia.ts      # Article fetching
│   │   │   ├── scriptGenerator.ts # AI script generation
│   │   │   ├── tts.ts            # Text-to-speech
│   │   │   └── audioStitcher.ts  # Audio processing
│   │   └── prompts/podcast.ts    # AI prompt template
│   └── package.json
├── frontend/             # React SPA
│   ├── src/
│   │   ├── App.tsx               # Main component
│   │   ├── components/           # UI components
│   │   ├── hooks/                # Custom hooks
│   │   └── services/api.ts       # API client
│   └── package.json
├── output/               # Generated artifacts (gitignored)
│   ├── scripts/          # JSON scripts
│   ├── audio/            # MP3 files
│   └── metadata/         # Generation metadata
├── specs/                # Documentation
│   └── 001-wiki-podcast-app/
│       ├── spec.md               # Feature specification
│       ├── plan.md               # Implementation plan
│       ├── data-model.md         # Data entities
│       └── contracts/api.yaml    # OpenAPI spec
├── .env.example          # Environment template
└── Dockerfile            # Docker configuration
```

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | ✅ | xAI Grok API key for script generation |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API key for text-to-speech |
| `PORT` | ❌ | Server port (default: 3000) |
| `OUTPUT_DIR` | ❌ | Output directory (default: ./output) |
| `NODE_ENV` | ❌ | Environment mode (default: development) |

## 🎯 Usage Examples

### Web Interface

1. Navigate to `http://localhost:3000`
2. Enter a Wikipedia URL or article title:
   - **URL**: `https://en.wikipedia.org/wiki/Quantum_Computing`
3. Click **Generate Podcast**
4. Watch progress through 4 stages
5. Play in browser or download MP3

### API Endpoints

```bash
# Generate podcast
curl -X POST http://localhost:3000/api/podcast \
  -H "Content-Type: application/json" \
  -d '{"input": "Albert Einstein", "type": "title"}'

# Get podcast metadata
curl http://localhost:3000/api/podcast/{id}

# Download audio
curl -O http://localhost:3000/api/podcast/{id}/audio

# Get script
curl http://localhost:3000/api/podcast/{id}/script

# Health check
curl http://localhost:3000/api/health
```

## 🎭 Podcast Structure

Every generated podcast follows a 5-section structure:

1. **Greeting** - Introduction and topic overview (Nishi & Shyam)
2. **Explanation** - Core factual content presentation (primarily Shyam)
3. **Clarification** - Deeper dive and connections (interactive)
4. **Q&A** - Back-and-forth discussion on key points
5. **Sign-off** - Key takeaways and conclusion

**Speakers**:
- **Nishi**: Enthusiastic host who asks questions and provides context
- **Shyam**: Knowledgeable host who explains concepts and answers questions

**Language**: Natural bilingual English-Hindi conversations reflecting authentic Indian speech patterns

## ✅ Quality Guarantees

- ✅ **Content Integrity**: All facts sourced from Wikipedia article only
- ✅ **Consistent Duration**: 120-180 seconds (2-3 minutes)
- ✅ **Two Distinct Voices**: Nishi and Shyam with unique voice profiles
- ✅ **Deterministic Output**: Same input produces consistent results
- ✅ **Fast Generation**: Complete in under 2 minutes

## 🛠️ Troubleshooting

### Common Issues

**"FFmpeg not found"**
```bash
# Install FFmpeg
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Ubuntu/Debian
```

**"API Key Invalid"**
```bash
# Check environment variables
cat .env | grep API_KEY
# Verify keys haven't expired at x.ai and elevenlabs.io
```

**"Article not found"**
- Ensure URL is from `en.wikipedia.org` (English Wikipedia only)
- Check article exists by visiting URL in browser

### Health Check

```bash
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "ffmpeg": "ok",
    "outputDir": "ok"
  }
}
```

## 📚 Documentation

- **[Technical Design Document](./TECHNICAL_DESIGN.md)** - Comprehensive system documentation
- **[Feature Specification](./specs/001-wiki-podcast-app/spec.md)** - User stories and requirements
- **[Implementation Plan](./specs/001-wiki-podcast-app/plan.md)** - Technical architecture
- **[Data Model](./specs/001-wiki-podcast-app/data-model.md)** - Entity definitions
- **[API Contract](./specs/001-wiki-podcast-app/contracts/api.yaml)** - OpenAPI specification
- **[Quick Start Guide](./specs/001-wiki-podcast-app/quickstart.md)** - Setup instructions

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🙏 Acknowledgments

- **Wikipedia** - Source content via REST API
- **xAI** - Grok AI model for script generation
- **ElevenLabs** - High-quality text-to-speech synthesis
- **FFmpeg** - Audio processing

---

**Built with accuracy, predictability, and educational intent.**

For detailed technical documentation, see [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)

