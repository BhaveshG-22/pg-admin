import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, expectedVariables, allowedVariables, genderPreference = 'neutral', step = 'metadata' } = await request.json()

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

    // STEP 2: Generate prompt template with ONLY allowed variables
    if (step === 'prompt' && allowedVariables && Array.isArray(allowedVariables)) {
      return await generatePromptTemplate(prompt, allowedVariables, genderPreference)
    }

    // STEP 1: Generate metadata and input fields (default)
    // Parse expected variables if provided
    const variablesList = expectedVariables
      ? expectedVariables.split('\n').map((v: string) => v.trim()).filter((v: string) => v.length > 0)
      : null

    const variablesInstruction = variablesList
      ? `\n\n⚠️ CRITICAL CONSTRAINT - THE USER HAS SPECIFIED EXACT VARIABLES ⚠️\n\nAllowed variables ONLY:\n${variablesList.map((v: string) => `- {{${v}}}`).join('\n')}\n\nSTRICT RULES:\n1. Create input fields for EXACTLY these ${variablesList.length} variable(s) - NO MORE, NO LESS\n2. In the prompt template, you may ONLY use these variable names: ${variablesList.join(', ')}\n3. Any text that is NOT one of these variables MUST be kept as static text in the prompt\n4. Do NOT create variables for: subject, pose, props, location, background, clothing, or ANY other concept unless it is in the allowed list above\n5. If the original prompt mentions something not in the allowed variables, write it as plain text in the output prompt\n\nExample: If allowed variables are "color" and "number", then:\n- CORRECT: "A person wearing {{color}} clothes holding {{number}} balloons"\n- WRONG: "{{subject}} wearing {{color}} {{clothing}} holding {{number}} {{props}}" (subject, clothing, props are not allowed!)`
      : ''

    // Gender preference instructions
    const genderInstructions: Record<string, string> = {
      neutral: 'Make the prompt GENDER NEUTRAL. Replace gender-specific terms (e.g., "man", "woman", "boy", "girl", "he", "she") with neutral alternatives (e.g., "person", "individual", "they"). Default values should also be gender neutral.',
      male: 'Keep the prompt MALE SPECIFIC. Use male pronouns and terms (e.g., "man", "boy", "he", "his"). Default values should reflect male-specific examples.',
      female: 'Make the prompt FEMALE SPECIFIC. Use female pronouns and terms (e.g., "woman", "girl", "she", "her"). Default values should reflect female-specific examples.'
    }

    const genderInstruction = `\n\nGENDER PREFERENCE: ${genderInstructions[genderPreference as keyof typeof genderInstructions] || genderInstructions.neutral}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes image generation prompts and converts them into structured presets with dynamic input variables.${variablesInstruction}${genderInstruction}

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
  "badge": "Add a relevant emoji followed by text (e.g., '🎭 Film Noir', '✨ Featured', '🔥 Trending', '💎 Premium', '🎨 Creative')",
  "badgeColor": "Tailwind CSS classes separated by spaces for background, text, and border (e.g., 'bg-gray-100 text-gray-800 border-gray-200', 'bg-blue-100 text-blue-800 border-blue-200', 'bg-purple-100 text-purple-800 border-purple-200')",
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
   - CRITICAL: Each unique variable must have a UNIQUE name. If the same concept appears multiple times, use the SAME variable name
   - Example: "silver balloons... and star-shaped balloons" → use ONE variable {{balloons}} for both, with defaultValue combining both descriptions
   - DO NOT create multiple variables for the same type of thing (e.g., shape_of_balloon, shape_of_balloon_number)

5. BEST PRACTICES:
   - If user provides specific variables, create input fields for ONLY those variables
   - If no variables specified, create 2-6 input fields (don't overdo it)
   - Make the main subject field required
   - Use clear, user-friendly labels
   - Provide helpful placeholder examples
   - Keep variable names short and lowercase with underscores (e.g., subject, photo_style, lighting_type)
   - Only use "number" type for actual numeric values (age, quantity, etc.)
   - AVOID creating overly specific variable names - use general terms (e.g., "balloons" not "shape_of_balloon")
   - If something appears multiple times with slight variations, consolidate into ONE variable with a comprehensive defaultValue

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
  { name: "subject", label: "Subject Description", type: "text", placeholder: "Describe the person (age, gender, features)", defaultValue: "A young man", required: true },
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

// STEP 2: Generate prompt template using ONLY allowed variables
async function generatePromptTemplate(
  originalPrompt: string,
  allowedVariables: string[],
  genderPreference: string
) {
  try {
    // Gender preference instructions
    const genderInstructions: Record<string, string> = {
      neutral: 'Make the prompt GENDER NEUTRAL. Replace gender-specific terms (e.g., "man", "woman", "boy", "girl", "he", "she") with neutral alternatives (e.g., "person", "individual", "they").',
      male: 'Keep the prompt MALE SPECIFIC. Use male pronouns and terms (e.g., "man", "boy", "he", "his").',
      female: 'Make the prompt FEMALE SPECIFIC. Use female pronouns and terms (e.g., "woman", "girl", "she", "her").'
    }

    const genderInstruction = genderInstructions[genderPreference as keyof typeof genderInstructions] || genderInstructions.neutral

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are creating a prompt template from an original prompt.

⚠️ CRITICAL RULES ⚠️

You have been given these EXACT variable names to use:
${allowedVariables.map((v) => `- {{${v}}}`).join('\n')}

Your task:
1. Transform the original prompt into a template
2. You may ONLY use these ${allowedVariables.length} variable(s): ${allowedVariables.join(', ')}
3. Replace the relevant parts of the prompt with ONLY these variables
4. Keep EVERYTHING ELSE as static text
5. DO NOT create or use ANY other variables like {{subject}}, {{pose}}, {{props}}, {{location}}, etc.

Gender preference: ${genderInstruction}

Return ONLY a JSON object with this structure:
{
  "prompt": "The prompt template using ONLY the allowed variables"
}

Example:
If allowed variables are: ["color", "number"]
Original: "A young man wearing a blue shirt holding 5 red balloons"
Output: {"prompt": "A young person wearing a {{color}} shirt holding {{number}} red balloons"}

Notice: "young man" was changed to "young person" (static text), only "blue" became {{color}} and we could add {{number}} for "5"`,
        },
        {
          role: 'user',
          content: originalPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating prompt template:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prompt template',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
