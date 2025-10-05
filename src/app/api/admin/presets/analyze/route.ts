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
          content: `You are an AI assistant that analyzes image generation prompts and converts them into structured presets with dynamic input variables.

Your task is to:
1. Analyze the prompt and identify parts that should be user-customizable
2. Create input fields for those customizable parts
3. Transform the original prompt into a template with {{variable}} placeholders
4. Generate all necessary metadata

Return a JSON object with the following structure:

{
  "title": "A short, catchy title (3-6 words)",
  "description": "A brief description of what this preset does (1-2 sentences)",
  "slug": "a-url-friendly-slug",
  "badge": "A single word badge like 'Popular', 'New', 'Pro', 'Premium', 'Trending'",
  "badgeColor": "A color name like 'blue', 'purple', 'green', 'pink', 'yellow', 'red', 'orange'",
  "credits": A number between 5-50 based on complexity (simple=5-10, medium=15-25, complex=30-50),
  "category": "One of: Portrait, Style, Effect, Background, Enhancement",
  "provider": "NANO_BANANA",
  "prompt": "The transformed prompt template with {{variable}} placeholders",
  "inputFields": [
    {
      "name": "variable_name",
      "label": "Human Readable Label",
      "type": "text" | "number",
      "placeholder": "Helpful placeholder text",
      "defaultValue": "The actual value extracted from the original prompt",
      "required": true | false
    }
  ]
}

Guidelines for creating input fields:
1. IDENTIFY VARIABLES: Look for specific, customizable parts in the prompt:
   - Subject/Person descriptions (e.g., "a young man" → make it variable)
   - Styles (e.g., "professional", "candid", "artistic")
   - Settings/Locations (e.g., "modern studio", "outdoor park")
   - Moods/Atmospheres (e.g., "warm", "dramatic", "soft")
   - Colors (e.g., "silver balloons" → "{{color}} balloons")
   - Actions/Poses (e.g., "sitting casually", "standing confidently")
   - Specific details (e.g., age, clothing, props)

2. VARIABLE TYPES:
   - Use "text" for: all text inputs (subject descriptions, styles, locations, moods, etc.)
   - Use "number" for: ages, quantities, counts

3. COMMON INPUT FIELDS TO CONSIDER:
   - subject: Main subject description (text, required)
   - style: Photography/art style (text)
   - mood: Atmosphere/mood (text)
   - location: Setting/background (text)
   - lighting: Lighting type (text)
   - pose: Subject's pose or action (text)
   - age: Age of subject (number)
   - clothing: What subject is wearing (text)
   - props: Additional props or items (text)

4. TRANSFORM THE PROMPT:
   - Replace specific details with {{variableName}} placeholders
   - Keep the prompt structure and flow natural
   - Example: "A young man sitting casually" → "{{subject}} {{pose}}"
   - Example: "modern studio with silver balloons" → "{{location}} with {{props}}"

5. BEST PRACTICES:
   - Create 2-6 input fields (don't overdo it)
   - Make the main subject field required
   - Use clear, user-friendly labels
   - Provide helpful placeholder examples
   - Keep variable names short and lowercase with underscores (e.g., subject, photo_style, lighting_type)
   - Only use "number" type for actual numeric values (age, quantity, etc.)

6. DEFAULT VALUES:
   - ALWAYS include "defaultValue" for EVERY input field
   - Extract the actual value from the original prompt
   - This allows users to keep defaults or edit only what they want
   - Example: If prompt says "A young man", defaultValue for subject should be "A young man"

Example transformation:
Input: "A birthday celebration photoshoot in a stylish modern studio setup. A young man is sitting casually on the floor in front of a decorated wall with silver balloons, wearing a casual outfit."

Output prompt: "A {{event_type}} photoshoot in {{location}}. {{subject}} {{pose}} in front of {{background}} with {{props}}, wearing {{clothing}}."

Output inputFields: [
  { name: "event_type", label: "Event Type", type: "text", placeholder: "e.g., birthday celebration, anniversary", defaultValue: "birthday celebration", required: true },
  { name: "location", label: "Location/Setting", type: "text", placeholder: "e.g., modern studio, outdoor garden", defaultValue: "a stylish modern studio setup", required: true },
  { name: "subject", label: "Subject Description", type: "textarea", placeholder: "Describe the person (age, gender, features)", defaultValue: "A young man", required: true },
  { name: "pose", label: "Pose/Action", type: "text", placeholder: "e.g., sitting casually, standing confidently", defaultValue: "sitting casually on the floor", required: false },
  { name: "background", label: "Background Details", type: "text", placeholder: "e.g., decorated wall, brick wall", defaultValue: "a decorated wall", required: false },
  { name: "props", label: "Props/Items", type: "text", placeholder: "e.g., silver balloons, flowers", defaultValue: "silver balloons", required: false },
  { name: "clothing", label: "Clothing Style", type: "text", placeholder: "e.g., casual outfit, formal wear", defaultValue: "a casual outfit", required: false }
]

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
