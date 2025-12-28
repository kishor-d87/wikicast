import { Script, ScriptLine, Article } from '../types/index.js';
import { getConfig } from '../config/env.js';
import { SYSTEM_PROMPT, generateUserPrompt, GENERATION_PARAMS, PROMPT_VERSION } from '../prompts/podcast.js';
import https from 'https';
import fetch from 'node-fetch';

/**
 * Script Generator Service
 * 
 * Generates podcast scripts using xAI Grok API with deterministic settings.
 * Enforces constitution requirements for structure and content.
 */

// Create an HTTPS agent that handles SSL certificates properly
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokRequest {
  model: string;
  messages: GrokMessage[];
  temperature: number;
  max_tokens: number;
  top_p: number;
}

interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface RawScriptResponse {
  lines: Array<{
    index: number;
    speaker: 'Nishi' | 'Shyam';
    text: string;
    section: 'greeting' | 'explanation' | 'clarification' | 'qna' | 'signoff';
  }>;
}

/**
 * Validates that the script follows constitution requirements
 */
function validateScript(lines: ScriptLine[]): void {
  // Check minimum lines
  if (lines.length < 10) {
    throw new Error('Script too short: must have at least 10 lines');
  }
  
  // Check that all 5 sections are present
  const sections = new Set(lines.map(line => line.section));
  const requiredSections: Array<ScriptLine['section']> = [
    'greeting',
    'explanation',
    'clarification',
    'qna',
    'signoff'
  ];
  
  for (const section of requiredSections) {
    if (!sections.has(section)) {
      throw new Error(`Missing required section: ${section}`);
    }
  }
  
  // Check speakers are only Nishi and Shyam
  const speakers = new Set(lines.map(line => line.speaker));
  for (const speaker of speakers) {
    if (speaker !== 'Nishi' && speaker !== 'Shyam') {
      throw new Error(`Invalid speaker: ${speaker}. Only Nishi and Shyam are allowed.`);
    }
  }
  
  // Check section order
  const sectionOrder = ['greeting', 'explanation', 'clarification', 'qna', 'signoff'];
  let lastSectionIndex = -1;
  
  for (const line of lines) {
    const currentSectionIndex = sectionOrder.indexOf(line.section);
    if (currentSectionIndex < lastSectionIndex) {
      throw new Error(`Sections out of order at line ${line.index}`);
    }
    lastSectionIndex = currentSectionIndex;
  }
  
  // Check for excessive consecutive same speaker (max 5)
  let consecutiveCount = 1;
  let lastSpeaker = lines[0]?.speaker;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].speaker === lastSpeaker) {
      consecutiveCount++;
      if (consecutiveCount > 5) {
        throw new Error(`Too many consecutive lines by ${lastSpeaker} at line ${i + 1}`);
      }
    } else {
      consecutiveCount = 1;
      lastSpeaker = lines[i].speaker;
    }
  }
}

/**
 * Calculates estimated duration based on word count (150 WPM)
 */
function calculateDuration(lines: ScriptLine[]): { totalWords: number; estimatedDuration: number } {
  const totalWords = lines.reduce((sum, line) => {
    return sum + line.text.split(/\s+/).length;
  }, 0);
  
  // Average speaking rate: 150 words per minute
  const estimatedDuration = Math.round((totalWords / 150) * 60);
  
  return { totalWords, estimatedDuration };
}

/**
 * Organizes lines by section
 */
function organizeSections(lines: ScriptLine[]) {
  const sections = {
    greeting: [] as number[],
    explanation: [] as number[],
    clarification: [] as number[],
    qna: [] as number[],
    signoff: [] as number[],
  };
  
  lines.forEach((line) => {
    sections[line.section].push(line.index);
  });
  
  return sections;
}

/**
 * Generates a unique script ID based on article title and timestamp
 */
function generateScriptId(articleTitle: string): string {
  const sanitized = articleTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  
  return `${sanitized}_${timestamp}`;
}

/**
 * Calls xAI Grok API to generate script
 */
async function callGrokAPI(articleTitle: string, articleContent: string): Promise<RawScriptResponse> {
  const config = getConfig();
  const apiUrl = 'https://api.x.ai/v1/chat/completions';
  
  const request: GrokRequest = {
    model: GENERATION_PARAMS.model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: generateUserPrompt(articleTitle, articleContent),
      },
    ],
    temperature: GENERATION_PARAMS.temperature,
    max_tokens: GENERATION_PARAMS.maxTokens,
    top_p: GENERATION_PARAMS.topP,
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.xaiApiKey}`,
      },
      body: JSON.stringify(request),
      agent: httpsAgent,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as GrokResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Grok API');
    }
    
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsed: RawScriptResponse;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(`Failed to parse Grok response as JSON: ${parseError}`);
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error calling Grok API');
  }
}

/**
 * Generates a podcast script from an article
 */
export async function generateScript(article: Article): Promise<Script> {
  // Call Grok API
  const rawScript = await callGrokAPI(article.title, article.cleanedText);
  
  // Validate and transform lines
  const lines: ScriptLine[] = rawScript.lines.map((line) => ({
    index: line.index,
    speaker: line.speaker,
    text: line.text.trim(),
    section: line.section,
  }));
  
  // Validate constitution compliance
  validateScript(lines);
  
  // Calculate duration
  const { totalWords, estimatedDuration } = calculateDuration(lines);
  
  // Validate duration (should be 120-180 seconds)
  if (estimatedDuration < 120 || estimatedDuration > 180) {
    console.warn(
      `Script duration ${estimatedDuration}s outside target range (120-180s). Word count: ${totalWords}`
    );
  }
  
  // Generate script ID
  const scriptId = generateScriptId(article.title);
  
  // Build script entity
  const script: Script = {
    id: scriptId,
    articleTitle: article.title,
    articleUrl: article.url,
    lines,
    sections: organizeSections(lines),
    totalWords,
    estimatedDuration,
    generatedAt: new Date().toISOString(),
    model: GENERATION_PARAMS.model,
    generationParams: {
      temperature: GENERATION_PARAMS.temperature,
      maxTokens: GENERATION_PARAMS.maxTokens,
      promptVersion: PROMPT_VERSION,
    },
  };
  
  return script;
}

