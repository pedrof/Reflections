import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_API_KEY,
});

const model = process.env.AI_MODEL || 'claude-sonnet-4-6';

export async function generateClarifyingQuestions(rawText) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_completion_tokens: 512,
    messages: [
      {
        role: 'system',
        content: `You are a federal government performance writing assistant reviewing a draft accomplishment.
Identify 2 to 4 specific pieces of information that are missing or vague and that would meaningfully improve a professional performance appraisal write-up.
Focus on: measurable results (numbers, percentages, timelines), specific context or challenge that prompted the work, the employee's distinct role versus their team's, and concrete actions taken.
Do NOT ask about things already clearly stated.
Return ONLY valid JSON in this exact shape, no other text:
{ "questions": [{ "id": "q1", "question": "<short, specific question>" }, ...] }`,
      },
      { role: 'user', content: rawText },
    ],
  });
  const raw = completion.choices[0].message.content.trim();
  return JSON.parse(raw);
}

export async function rewriteAsSTAR(rawText, answers = []) {
  const answersBlock = answers.length
    ? `\n\nAdditional context provided by the employee:\n${answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
    : '';

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    max_completion_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: `You are a professional federal government performance writing assistant.
Rewrite the following accomplishment as a single, cohesive narrative paragraph suitable for a formal performance appraisal write-up.
The paragraph must organically follow the STAR method — weaving together the Situation, Task, Action, and Result — but without using labels or section headers.
Use clear, confident, results-oriented language in first person appropriate for a government performance review.
Be concise but impactful. Quantify results where the information is provided.
Do not invent facts. Only expand and professionalize what is provided.
Return only the narrative paragraph, no preamble or labels.`,
      },
      { role: 'user', content: `${rawText}${answersBlock}` },
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
