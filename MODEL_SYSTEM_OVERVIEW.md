# Model-Based Example Generation System - Complete Overview

## System Architecture

This document explains the complete model-based example generation system that was built to generate preset examples using S3-hosted model images.

## Components

### 1. Model Images (72 total)
- **Location**: AWS S3 bucket `pixelglow-admin-assets`
- **Structure**:
  - `models/male/` - 36 male model images
  - `models/female/` - 36 female model images
- **Format**: PNG images generated using Replicate Nano Banana
- **Access**: Public HTTPS URLs

### 2. models.json
- **Purpose**: Central registry of all available model images with S3 URLs
- **Structure**:
```json
{
  "male": [
    {
      "id": "male_01",
      "gender": "male",
      "s3Url": "https://pixelglow-admin-assets.s3.us-east-1.amazonaws.com/models/male/male_01_1767713191241.png"
    },
    ...
  ],
  "female": [
    {
      "id": "female_01",
      "gender": "female",
      "s3Url": "https://pixelglow-admin-assets.s3.us-east-1.amazonaws.com/models/female/female_01_1767713191241.png"
    },
    ...
  ]
}
```

### 3. Database Schema

#### PresetModelUsage Table
Tracks which models have been used for each preset to avoid repetition:
```prisma
model PresetModelUsage {
  id       String   @id @default(cuid())
  presetId String
  modelId  String   // Model ID from models.json (e.g., "male_01", "female_05")
  usedAt   DateTime @default(now())
  preset   Preset   @relation(fields: [presetId], references: [id], onDelete: Cascade)

  @@unique([presetId, modelId])
  @@map("preset_model_usage")
}
```

**Note**: `modelId` now stores IDs from `models.json`, not database foreign keys. This decouples the system from the GlobalModel table.

#### Preset Table
```prisma
model Preset {
  // ... other fields
  gallery      Json?               // Stores generated examples
  modelUsage   PresetModelUsage[]  // Tracks which models were used
}
```

### 4. Model Selection Library (`src/lib/model-selection.ts`)

**Key Functions**:

#### `selectModelsForPreset(presetId: string, totalModels: number)`
- Selects equal number of male and female models
- Excludes models already used for this preset
- Returns random selection from available models
- Uses in-memory cache for fast lookups

**Example**:
```typescript
const models = await selectModelsForPreset('preset-123', 20)
// Returns: 10 male + 10 female models with S3 URLs
```

#### `recordModelUsage(presetId: string, modelIds: string[])`
- Records which models were used for a preset
- Prevents duplicate entries
- Allows tracking of model usage over time

**Example**:
```typescript
await recordModelUsage('preset-123', ['male_01', 'male_05', 'female_03'])
```

### 5. Queue System (`src/lib/queue.ts`)

**Purpose**: Manages background jobs for example generation

**Configuration**:
- Queue name: `example-generation`
- Uses Redis (configured via `GENERATE_QUEUE` env variable)
- 3 retry attempts with exponential backoff
- Keeps last 100 completed/failed jobs

**Job Data Structure**:
```typescript
interface ExampleGenerationJob {
  presetId: string
  examplesPerModel: number
}
```

### 6. API Route (`src/app/api/admin/presets/[id]/generate-examples/route.ts`)

**Endpoint**: `POST /api/admin/presets/[id]/generate-examples`

**Request Body**:
```json
{
  "examplesPerModel": 1
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "12345",
  "message": "Example generation job queued for preset \"Professional Headshot\"",
  "presetId": "preset-123",
  "examplesPerModel": 1
}
```

### 7. Worker (`src/workers/example-generator.ts`)

**Process Flow**:

1. **Job Start** (Progress: 10%)
   - Receives job from queue
   - Validates preset exists

2. **Model Selection** (Progress: 20%)
   - Calls `selectModelsForPreset(presetId, 20)` to get 10 male + 10 female models
   - Excludes previously used models

3. **Example Generation** (Progress: 20-80%)
   - For each of 20 selected models:
     - Generates `examplesPerModel` images using Replicate
     - Uses model's S3 URL as input image
     - Uses preset's prompt and provider settings
   - Progress updates after each model

4. **Record Usage** (Progress: 85%)
   - Calls `recordModelUsage(presetId, modelIds)`
   - Marks all 20 models as used for this preset

5. **Update Gallery** (Progress: 90%)
   - Appends generated examples to preset's gallery field
   - Updates `lastGenerated` timestamp

6. **Complete** (Progress: 100%)
   - Returns summary of generation results

**Supported Providers**:
- `NANO_BANANA` (default) - google/nano-banana
- `STABLE_DIFFUSION` - stability-ai/stable-diffusion
- `FLUX_PRO` - black-forest-labs/flux-1.1-pro
- `FLUX_KONTEXT` - black-forest-labs/flux-1.1-pro

## How It Works Together

### Example Generation Flow

```
User clicks "Generate Examples" button
           ↓
Admin UI (preset detail page)
           ↓
POST /api/admin/presets/{id}/generate-examples
           ↓
Job added to Redis queue
           ↓
Worker picks up job
           ↓
┌──────────────────────────────────────┐
│ 1. Load preset from database         │
│ 2. Select 20 models from models.json │
│    - Exclude already used models     │
│    - 10 male + 10 female             │
│ 3. For each model:                   │
│    - Call Replicate API              │
│    - Use model S3 URL as input       │
│    - Use preset prompt               │
│    - Generate images                 │
│ 4. Record model usage in database    │
│ 5. Update preset gallery field       │
└──────────────────────────────────────┘
           ↓
Job completes successfully
```

### Model Selection Logic

```typescript
// Load all models from JSON
const allModels = { male: [...36 models], female: [...36 models] }

// Get already used models from database
const usedModelIds = ['male_01', 'male_03', 'female_05', ...]

// Filter available models
const availableMale = allModels.male.filter(m => !usedModelIds.has(m.id))
const availableFemale = allModels.female.filter(m => !usedModelIds.has(m.id))

// Randomly select 10 of each
const selected = [
  ...shuffle(availableMale).slice(0, 10),
  ...shuffle(availableFemale).slice(0, 10)
]
```

## Usage

### 1. Start the Worker

```bash
npm run worker
```

This starts the background worker that processes example generation jobs.

### 2. Generate Examples via Admin UI

1. Navigate to `/admin/presets/{id}`
2. Scroll to "Gallery - Example Generations" section
3. Click "Generate Examples" button
4. Set number of examples per model (default: 1)
5. Submit

The system will:
- Queue a background job
- Select 20 unused models (10 male + 10 female)
- Generate images for each model
- Update the preset's gallery
- Mark models as used for this preset

### 3. Monitor Jobs

You can monitor job progress through:
- Worker console logs
- Redis queue inspection
- Database `preset.gallery` field updates

## Key Features

### 1. Smart Model Selection
- Automatically selects equal numbers of male and female models
- Tracks usage to avoid repetition
- Randomly selects from available pool

### 2. Provider Flexibility
- Supports multiple AI image generation providers
- Provider-specific input configuration
- Easy to add new providers

### 3. Robust Queue System
- Automatic retries on failure (3 attempts)
- Exponential backoff
- Job history tracking

### 4. Progress Tracking
- Real-time progress updates during generation
- Detailed logging
- Error handling for individual model failures

### 5. Data Integrity
- Models are never deleted, only their usage is tracked
- Gallery updates are atomic
- Duplicate usage prevention

## Environment Variables Required

```bash
# Replicate API
REPLICATE_API_TOKEN=your_token_here

# Redis Queue
GENERATE_QUEUE=redis://your-redis-url

# AWS S3 (already configured for model hosting)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

## File Structure

```
pg-admin/
├── models.json                    # Model registry with S3 URLs
├── src/
│   ├── lib/
│   │   ├── model-selection.ts     # Model selection logic
│   │   ├── queue.ts               # Queue configuration
│   │   └── prisma.ts              # Database client
│   ├── workers/
│   │   └── example-generator.ts   # Background worker
│   └── app/
│       └── api/
│           └── admin/
│               └── presets/
│                   └── [id]/
│                       └── generate-examples/
│                           └── route.ts  # API endpoint
└── prisma/
    └── schema.prisma              # Database schema
```

## Benefits of This Architecture

### 1. Performance
- S3-hosted images load instantly
- In-memory model cache reduces disk I/O
- Background processing doesn't block UI

### 2. Scalability
- Can handle hundreds of presets
- Queue system prevents overload
- Easy to add more worker processes

### 3. Maintainability
- Models stored in simple JSON file
- No complex database joins needed
- Clear separation of concerns

### 4. Reliability
- Automatic retry on failures
- Tracks usage to prevent duplicates
- Graceful error handling

### 5. Cost Efficiency
- Reuses same 72 model images across all presets
- S3 storage is cheap and fast
- No need to regenerate model images

## Future Enhancements

1. **Add More Models**: Simply regenerate models.json with new images
2. **Multiple Image Sizes**: Store different resolutions in S3
3. **Model Ratings**: Track which models generate best examples
4. **Usage Analytics**: Analyze which models are most popular
5. **Custom Model Selection**: Allow manual model selection in UI

## Troubleshooting

### Worker Not Processing Jobs
- Check Redis connection: `GENERATE_QUEUE` env variable
- Ensure worker is running: `npm run worker`
- Check worker logs for errors

### Models Not Loading
- Verify `models.json` exists in project root
- Check file permissions
- Verify S3 URLs are publicly accessible

### Generation Failures
- Check Replicate API token: `REPLICATE_API_TOKEN`
- Verify provider is supported
- Check worker error logs

### No Available Models
- Check PresetModelUsage table for this preset
- Clear usage history if needed: delete from preset_model_usage where preset_id = 'x'
- Ensure models.json has 72 models (36 male + 36 female)

## Summary

This system provides a complete solution for generating preset examples using a pool of 72 S3-hosted model images. It intelligently selects models, generates examples in the background, and tracks usage to ensure variety across multiple generation runs.

The architecture is:
- **Fast**: In-memory caching, S3 hosting
- **Reliable**: Queue system, retry logic
- **Scalable**: Background processing, multiple workers
- **Maintainable**: Simple JSON registry, clear code structure
- **Cost-efficient**: Reuse same model images across all presets
