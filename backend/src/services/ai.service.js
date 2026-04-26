import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_API_KEY,
});

const model = process.env.AI_MODEL || 'claude-sonnet-4-6';

export async function rewriteAsSTAR(rawText) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    max_completion_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: `You are a professional federal government performance writing assistant.
Rewrite the following accomplishment in STAR format (Situation, Task, Action, Result).
Use clear, professional language appropriate for a government performance review.
Be concise but impactful. Label each section: **Situation:**, **Task:**, **Action:**, **Result:**
Do not invent facts. Only expand and professionalize what is provided.
Return only the formatted STAR text, no preamble.`,
      },
      { role: 'user', content: rawText },
    ],
  });
  return completion.choices[0].message.content.trim();
}

export async function recommendLinks(starText, objectives, elements) {
  const objectiveList = objectives
    .map((o) => `ID ${o.id}: ${o.title} — ${o.description}`)
    .join('\n');
  const elementList = elements
    .map((e) => `ID ${e.id}: ${e.title} — ${e.description}`)
    .join('\n');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_completion_tokens: 512,
    messages: [
      {
        role: 'system',
        content: `You are a federal performance management assistant.
Given an accomplishment and a list of objectives and performance elements,
recommend which objectives and/or elements this accomplishment best supports.
Return ONLY valid JSON in this exact shape:
{
  "objectiveIds": [<array of matching objective IDs>],
  "elementIds": [<array of matching element IDs>],
  "reasoning": "<one sentence explanation>"
}
Do not include any text outside the JSON.`,
      },
      {
        role: 'user',
        content: `Accomplishment:\n${starText}\n\nObjectives:\n${objectiveList}\n\nElements:\n${elementList}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content.trim();
  return JSON.parse(raw);
}

export async function generateWARNarrative(accomplishments, employeeName, startDate, endDate) {
  const entries = accomplishments
    .map((a, i) => `${i + 1}. ${a.editedStarText || a.starText || a.rawText}`)
    .join('\n\n');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_completion_tokens: 768,
    messages: [
      {
        role: 'system',
        content: `You are a professional federal government report writer.
Generate a concise Weekly Activity Report (WAR) summary paragraph for an employee
based on their accomplishments for the given date range.
Use third person. Be professional, specific, and results-focused.`,
      },
      {
        role: 'user',
        content: `Employee: ${employeeName}
Period: ${startDate} to ${endDate}

Accomplishments:
${entries}`,
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}
