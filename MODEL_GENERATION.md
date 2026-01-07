# Model Image Generation System

This system generates realistic model images from prompts using Replicate's Nano Banana model with a queue-based architecture.

## Architecture

- **Prompts File**: `model-prompts.json` - Contains 39 male and 36 female model prompts
- **Job Creator**: `generate-models.ts` - Adds generation jobs to the queue
- **Worker**: `src/workers/model-generator.ts` - Processes jobs and generates images
- **Queue**: BullMQ + Redis - Ensures no jobs are dropped with retry logic

## Setup

1. Make sure your `.env` file has the required credentials:
```env
GENERATE_QUEUE=rediss://...  # Already configured
REPLICATE_API_TOKEN=r8_...   # Already configured
```

2. Install dependencies (if not already installed):
```bash
npm install
```

## Usage

### Step 1: Start the Worker

In one terminal, start the worker to process jobs:

```bash
npm run worker:models
```

The worker will:
- Wait for jobs to appear in the queue
- Generate images using Replicate Nano Banana
- Download and save images to `models/male/` and `models/female/`
- Retry failed jobs automatically (up to 3 attempts)
- Process 2 images concurrently

### Step 2: Add Jobs to Queue

In another terminal, add generation jobs:

**Generate 5 male models:**
```bash
npm run generate:models -- --gender male --count 5
```

**Generate 10 female models:**
```bash
npm run generate:models -- --gender female --count 10
```

**Generate all male models:**
```bash
npm run generate:models -- --gender male --count all
```

**Generate all female models:**
```bash
npm run generate:models -- --gender female --count all
```

**Generate 3 from both genders (6 total):**
```bash
npm run generate:models -- --gender both --count 3
```

**Generate all models (75 total):**
```bash
npm run generate:models -- --gender both --count all
```

## Output

Generated images are saved to:
- Male models: `models/male/{promptId}_{timestamp}.png`
- Female models: `models/female/{promptId}_{timestamp}.png`

Example: `models/male/male_01_1704556800000.png`

## Queue Features

- **Retry Logic**: Failed jobs automatically retry up to 3 times with exponential backoff
- **Progress Tracking**: Each job reports progress (0-100%)
- **Concurrency**: Process multiple images simultaneously (default: 2)
- **Persistence**: Jobs survive worker restarts
- **No Data Loss**: Redis ensures jobs aren't dropped

## Monitoring

Watch the worker terminal to see:
- Job progress and status
- Generated image URLs
- Download progress
- Completion confirmations
- Any errors with retry attempts

## Adjusting Concurrency

To process more images simultaneously, edit `src/workers/model-generator.ts`:

```typescript
{
  connection,
  concurrency: 5, // Change from 2 to 5 for 5 concurrent generations
}
```

Higher concurrency = faster but more API load and costs.

## Costs

Nano Banana on Replicate costs approximately $0.01 per generation.

- 10 images ≈ $0.10
- 50 images ≈ $0.50
- All 75 images ≈ $0.75

## Troubleshooting

**Worker not starting:**
- Check Redis connection in `.env`
- Ensure `GENERATE_QUEUE` is set correctly

**Jobs failing:**
- Check `REPLICATE_API_TOKEN` is valid
- Check Replicate API rate limits
- Worker automatically retries failed jobs

**Images not downloading:**
- Check `models/male` and `models/female` directories exist
- Check disk space
- Check network connectivity

## Prompt Structure

Each prompt includes:
- Professional photography specifications
- Age range and ethnicity
- Skin tone and hair details
- Facial features and expression
- Background and clothing
- Negative prompts to avoid AI artifacts

All prompts are designed for ultra-realistic, natural-looking model photos.
