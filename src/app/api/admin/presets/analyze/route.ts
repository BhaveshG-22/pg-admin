import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes image generation prompts and extracts structured metadata for a preset form.

Analyze the given prompt and return a JSON object with the following fields:

{
  "title": "A short, catchy title (3-6 words)",
  "description": "A brief description of what this preset does (1-2 sentences)",
  "slug": "a-url-friendly-slug",
  "badge": "A single word badge like 'Popular', 'New', 'Pro', 'Premium', 'Trending'",
  "badgeColor": "A Tailwind color class like 'blue', 'purple', 'green', 'pink', 'yellow'",
  "credits": A number between 5-50 based on complexity (simple=5-10, medium=15-25, complex=30-50),
  "category": "One of: Portrait, Product, Fashion, Food, Interior, Landscape, Abstract, Celebration, Professional",
  "provider": "NANO_BANANA" (always use this for now),
  "prompt": "The original prompt text",
  "inputFields": [
    {
      "name": "field_name",
      "label": "Human Readable Label",
      "type": "text" or "textarea" or "number" or "select",
      "placeholder": "Helpful placeholder text",
      "required": true or false,
      "options": ["option1", "option2"] (only for select type)
    }
  ],
  "variables": {
    "variable_name": "{{field_name}}"
  }
}

Guidelines:
- For input fields, identify placeholders in the prompt like "reference image", "subject", "style", etc.
- Common fields: subject_description, style, lighting, camera_angle, background, mood, colors, etc.
- Use textarea for long descriptions, text for short inputs, number for quantities
- Variables map input field names to placeholders in the prompt using {{field_name}} syntax
- Credits should reflect complexity: more specific details = higher credits
- Badge should match the theme (celebration events = "Trending", professional = "Pro", etc.)

Return ONLY valid JSON, no markdown or explanation.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing prompt:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze prompt',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
