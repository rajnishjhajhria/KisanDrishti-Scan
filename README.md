# Kisan Scan

Kisan Scan is a mini machine learning web project for crop image analysis. It uses trained PyTorch models to detect plant diseases and estimate crop quality from uploaded images, then optionally adds farmer-friendly guidance using Claude AI.

## Overview

This project combines:

- computer vision with deep learning
- a FastAPI backend for model inference
- a React + Vite frontend for image upload and results
- optional Anthropic Claude enrichment for readable advice

## Features

- Upload crop images from the browser
- Disease prediction using a trained PyTorch model
- Quality grading using a trained PyTorch model
- Top prediction confidence scores
- Optional Claude AI enrichment for:
  - disease explanation
  - simple treatment suggestions
  - prevention tips
  - market advice
  - farmer-friendly note

## Tech Stack

- Frontend: React, Vite
- Backend: FastAPI, Uvicorn
- ML: PyTorch, Torchvision, Pillow, NumPy
- AI enrichment: Anthropic Claude API

## Project Structure

```text
kisan-scan/
|-- backend/
|   |-- main.py
|   `-- requirements.txt
|-- frontend/
|   `-- src/
|-- public/
|-- saved_models/
|   |-- disease_model.pth
|   |-- quality_model.pth
|   |-- disease_classes.json
|   `-- quality_classes.json
|-- .venv/
|-- .env.example
|-- index.html
|-- package.json
|-- vite.config.js
`-- README.md
```

## ML Scope

This is a mini deep learning project because it includes:

- trained image classification models
- model loading and inference code
- a working API layer
- a frontend interface for real predictions

## Setup

### 1. Clone the project

```bash
git clone <your-repo-url>
cd kisan-scan
```

### 2. Frontend setup

```bash
npm install
```

### 3. Backend setup

Python 3.13 is recommended for this project.

Create and activate the backend environment:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

### 4. Environment variables

Copy `.env.example` to `.env` and add your real key:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

Important:

- Do not commit your real API key to GitHub.
- If a key was ever exposed, rotate it before publishing the repo.

## Run the Project

### Start the backend

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload
```

Backend runs at:

```text
http://localhost:8000
```

### Start the frontend

Open a new terminal:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API Endpoints

### `GET /`

Returns basic service status and whether the disease model, quality model, and Claude key are available.

### `GET /health`

Simple health check endpoint.

### `POST /analyze`

Accepts an image upload and returns:

- disease prediction
- quality prediction
- Claude enrichment when available
- inference timing

Supported file types:

- JPEG
- PNG
- WEBP

## Current Notes

- The trained PyTorch models are working locally.
- Claude integration is already connected in the backend.
- Claude responses depend on a valid Anthropic API key and available account credits.
- If Claude is unavailable, the model-only result can still work.

## Example Use Case

A farmer uploads a crop image, and the system returns:

- predicted disease class
- confidence score
- quality grade
- suggested treatment and prevention tips
- a simple farmer note in plain language

## Future Improvements

- better crop-specific filtering
- multilingual UI support
- batch image analysis
- model confidence calibration
- improved dataset coverage for Indian crops
- deployment on cloud or mobile-friendly hosting

## Author

Built as a mini machine learning and computer vision project focused on agriculture and crop health analysis.
