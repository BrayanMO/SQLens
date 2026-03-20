// File: src/services/ai.service.js

const suggestionSystemPrompt = `You are a SQL expert assistant for database incident troubleshooting.
Your task: generate a safe, read-only SQL query based on the user's problem description.
Rules:

1. Return ONLY a valid JSON object, no markdown, no explanation outside the JSON.
2. Format: { "sql": "...", "explanation": "...", "warnings": "...", "tags": ["tag1", "tag2"], "module": "..." }
3. CRITICAL: Your "explanation" and "warnings" MUST BE IN SPANISH.
4. NEVER generate INSERT, UPDATE, DELETE, DROP, TRUNCATE, or DDL statements.
5. If the request is ambiguous, generate a SELECT with placeholders.
6. CRITICAL: Return the "sql" string AS A SINGLE CONTINUOUS LINE without any newline characters (\\n). NEVER add SQL comments (-- or /* */) inside the "sql" string. Keep the "sql" string completely clean, inline, and raw. Put all your thoughts and explanations inside the "explanation" JSON field.
7. Tags must be 3-5 keywords in lowercase.
8. Module must be one of: "pedido", "incentivos", "crm", "stock", "otros".
9. CONTEXTO DE TABLAS: Si se proporciona una lista de tablas conocidas, DEBES usarlas en tus explicaciones y ejemplos para demostrar que conoces el esquema del usuario.
10. SEGURIDAD DML: Si el usuario pide un UPDATE, DELETE, INSERT o DDL, NO generes el código en el campo "sql" (ponlo como null o un comentario seguro). Sin embargo, en el campo "explanation", proporciona un EJEMPLO de cómo sería la consulta usando las tablas conocidas del contexto, **usando bloques de código Markdown** (\`\`\`sql) para que sea legible, aclarando que es solo para fines educativos y de referencia.

{SCHEMA_CONTEXT}

User's problem: {USER_INPUT}`;

/**
 * Calls OpenRouter AI API to generate a SQL query based on user input
 */
const generateAISqlSuggestion = async (userInput, schemaContext = '') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const prompt = suggestionSystemPrompt
    .replace('{USER_INPUT}', userInput)
    .replace('{SCHEMA_CONTEXT}', schemaContext ? `Tablas conocidas en el sistema: ${schemaContext}` : '');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'meta-llama/llama-3-8b-instruct:free',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    
    const parsed = JSON.parse(content);
    return {
      sql: parsed.sql || null,
      explanation: parsed.explanation || 'No explanation provided.',
      warnings: parsed.warnings || 'AI-generated query, verify before execution.',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      module: parsed.module || 'otros'
    };
  } catch (error) {
    console.error('AI Service Error:', error);
    const aiError = new Error('Failed to generate AI suggestion');
    aiError.status = 503; 
    aiError.details = error.message;
    throw aiError;
  }
};

/**
 * Generates title, context and tags from raw SQL
 */
const generateMetadataFromSql = async (sqlQuery) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const systemPrompt = `You are a SQL analyzer. 
The user will provide a raw SQL query. 
Your task: generate a highly descriptive Spanish title, a clear context/explanation, relevant tags, and assign a module for it.
Rules:
1. Return ONLY a valid JSON object.
2. Format: { "title": "...", "context": "...", "tags": ["tag1", "tag2"], "module": "..." }
3. Title must be concise (max 100 chars).
4. Context should explain what the query does in business/technical terms.
5. Tags must be 3-5 keywords in lowercase.
6. Module must be one of: "pedido", "incentivos", "crm", "stock", "otros".
7. RESPOND IN SPANISH.

Raw SQL Query:
{SQL_INPUT}`;

  const prompt = systemPrompt.replace('{SQL_INPUT}', sqlQuery);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'meta-llama/llama-3-8b-instruct:free',
        messages: [{ role: 'system', content: prompt }]
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || '',
      context: parsed.context || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      module: parsed.module || 'otros'
    };
  } catch (error) {
    console.error('AI Metadata Error:', error);
    const aiError = new Error('Failed to generate metadata');
    aiError.status = 503; 
    throw aiError;
  }
};

/**
 * Suggests an emoji icon and a color based on module name
 */
const suggestModuleMetadata = async (name) => {
  const prompt = `You are a UI designer. The user is creating a module named "${name}".
Suggest a single emoji as an icon and a hex color code that fits this category.
Respond ONLY with a JSON object: { "icon": "...", "color": "..." }
Example: { "icon": "📦", "color": "#166534" }`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    return JSON.parse(content);
  } catch (error) {
    return { icon: '📁', color: '#475569' };
  }
};

/**
 * General AI Chat
 */
const chatGeneral = async (message, history = []) => {
  const messages = [
    { role: 'system', content: 'You are SQLens Assistant. Respond in Spanish. IMPORTANT: Use Markdown for formatting. Use triple backticks (```sql) for SQL code blocks to ensure they are separated from the text. Be concise and professional.' },
    ...history,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'openrouter/auto',
        messages
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.';
  } catch (error) {
    console.error('AI Chat Error:', error);
    return 'Error conectando con el servicio de chat.';
  }
};

module.exports = {
  generateAISqlSuggestion,
  generateMetadataFromSql,
  suggestModuleMetadata,
  chatGeneral
};
