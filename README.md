# SpeakSure - AI Automated Behavioral Interview System

An intelligent interview platform that leverages machine learning to analyze candidate responses in real-time, helping hiring managers make data-driven decisions during the recruitment process.

🎥 Demo Video: [https://drive.google.com/file/d/18E1ror1CspPB6zm4FAsQG4tsEK4KJR_5/view?usp=drive_link](https://drive.google.com/file/d/18E1ror1CspPB6zm4FAsQG4tsEK4KJR_5/view?usp=drive_link)

## 📋 About The Project

SpeakSure is an AI-powered behavioral interview system designed to assist hiring managers in shortlisting candidates more efficiently. The system uses a custom-trained Multi-Layer Perceptron (MLP) model to analyze human speech patterns, confidence levels, and various linguistic parameters in real-time.

### Key Features

- **🎤 Real-time Audio Recording & Analysis**: Capture and analyze candidate responses during interviews
- **🧠 AI-Powered Confidence Detection**: Custom MLP model trained on behavioral interview data to predict speaker confidence (1-5 scale)
- **📝 Automatic Transcription**: Leverages AssemblyAI for accurate speech-to-text conversion
- **✍️ Grammar Analysis**: Identifies and flags grammatical errors in responses
- **📊 Speech Metrics**: Calculates words per minute, duration, and other speech characteristics
- **🤖 LLM-Powered Insights**: Uses Google Gemini to generate actionable feedback for hiring managers
- **💾 Persistent Storage**: MongoDB for storing interview results
- **📈 Visual Analytics**: Interactive charts and dashboards for interview performance

## 🏗️ Project Structure

```
speaksure-interview/
├── client/                          # React Frontend Application
│   ├── src/
│   │   ├── Pages/                   # Main application pages
│   │   │   ├── HomePage.tsx         # Landing page
│   │   │   ├── InterviewPage.tsx    # Interview recording interface
│   │   │   └── InterviewResultPage.tsx  # Results visualization
│   │   ├── components/              # Reusable UI components (shadcn/ui)
│   │   │   ├── ui/                  # Base UI components
│   │   │   └── theme-provider.tsx   # Theme management
│   │   ├── layout/                  # Layout components
│   │   ├── styles/                  # CSS modules
│   │   └── lib/                     # Utility functions
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.ts               # Vite configuration
│
├── server/                          # Flask Backend Application
│   ├── app/
│   │   ├── api/                     # API layer
│   │   │   ├── routes.py            # API endpoints
│   │   │   └── services.py          # Business logic services
│   │   ├── core/                    # Core configuration
│   │   │   └── config.py            # App configuration
│   │   └── models/                  # ML models
│   │       ├── trained_model.h5     # TensorFlow MLP model
│   │       └── scaler.pkl           # Feature scaler
│   ├── requirements.txt             # Python dependencies
│   └── run.py                       # Application entry point
│
└── venv/                            # Python virtual environment
```

## 🛠️ Technology Stack

### Frontend

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **shadcn/ui** - UI component library
- **React Router DOM** - Navigation
- **Axios** - HTTP client
- **WaveSurfer.js** - Audio waveform visualization

### Backend

- **Flask** - Python web framework
- **TensorFlow** - Deep learning framework for MLP model
- **PyTorch** - Deep learning framework for Wav2Vec2
- **Transformers (Hugging Face)** - Wav2Vec2 audio feature extraction
- **librosa** - Audio processing and analysis
- **AssemblyAI** - Speech-to-text transcription
- **language-tool-python** - Grammar checking
- **MongoDB** - Database
- **Google Gemini** - LLM for generating insights
- **scikit-learn** - Feature scaling

### Machine Learning Pipeline

1. **Audio Feature Extraction**: Wav2Vec2 transformer model (`facebook/wav2vec2-base-960h`)
2. **Confidence Prediction**: Custom-trained MLP model
3. **Transcription**: AssemblyAI API
4. **Analysis**: Gemini 2.5 Flash for contextual feedback

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** (local or cloud instance)
- **API Keys**:
  - AssemblyAI API Key
  - Google Gemini API Key
  - MongoDB Connection URI

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd speaksure-interview
```

#### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file in the server directory
touch .env
```

Add the following environment variables to `.env`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
MONGO_URI=your-mongodb-connection-string
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
GOOGLE_API_KEY=your-google-gemini-api-key
```

#### 3. Frontend Setup

```bash
# Open a new terminal and navigate to client directory
cd client

# Install dependencies
npm install
# OR
yarn install
```

### Running the Application

#### Start the Backend Server

```bash
# From the server directory with virtual environment activated
cd server
source venv/bin/activate  # Activate venv if not already active
python run.py
```

The Flask server will start on `http://localhost:5000`

#### Start the Frontend Development Server

```bash
# From the client directory (in a new terminal)
cd client
npm run dev
# OR
yarn dev
```

The React app will start on `http://localhost:5173` (or another port if 5173 is busy)

## 🔧 Configuration

### Backend Configuration (`server/app/core/config.py`)

- `SAMPLE_RATE`: Audio sampling rate (default: 16000 Hz)
- `TRANSFORMER_MODEL_NAME`: Wav2Vec2 model identifier
- `MODEL_PATH`: Path to trained MLP model
- `SCALER_PATH`: Path to feature scaler
- `DATABASE_NAME`: MongoDB database name

### Frontend Configuration

Update the API base URL in your axios configuration if needed (typically in `client/src/` files).

## 📊 How It Works

1. **Interview Setup**: User enters candidate details and selects interview questions
2. **Audio Recording**: System records candidate's audio responses
3. **Real-time Processing**:
   - Audio is split into 10-second chunks
   - Wav2Vec2 extracts acoustic features
   - MLP model predicts confidence score for each chunk (1-5 scale)
4. **Transcription**: AssemblyAI converts speech to text
5. **Analysis**:
   - Grammar checker identifies linguistic errors
   - Speech rate calculated (words per minute)
   - Average confidence computed across all chunks
6. **AI Feedback**: Google Gemini generates critical feedback based on:
   - Answer relevancy to the question
   - Confidence levels
   - Speech rate
   - Overall coherence
7. **Results Storage**: All data saved to MongoDB for later review
8. **Visualization**: Interactive dashboard displays performance metrics

## 📁 API Endpoints

- `POST /api/upload` - Upload and analyze audio recording
- `GET /api/results` - Retrieve all interview results
- `GET /api/results/<interview_id>` - Get specific interview results
- Additional endpoints in `server/app/api/routes.py`
