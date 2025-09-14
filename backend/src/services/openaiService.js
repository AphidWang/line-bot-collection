const OpenAI = require('openai');

let openai = null;
let isXAI = false;

const initializeOpenAI = () => {
  if (openai) {
    return openai;
  }

  // 優先使用 xAI，如果沒有則使用 OpenAI
  const apiKey = process.env.XAI_API_KEY || process.env.OPENAI_API_KEY;
  isXAI = !!process.env.XAI_API_KEY;

  if (!apiKey) {
    console.log('⚠️ No AI API key found (XAI_API_KEY or OPENAI_API_KEY). AI summary feature will be disabled.');
    return null;
  }

  try {
    if (isXAI) {
      // xAI 使用直接 fetch，不需要 OpenAI SDK
      openai = { isXAI: true, apiKey };
      console.log('✅ xAI initialized successfully with model: grok-4-0709');
    } else {
      // OpenAI 使用 SDK
      openai = new OpenAI({
        apiKey: apiKey,
      });
      console.log('✅ OpenAI initialized successfully with model: gpt-3.5-turbo');
    }
    
    return openai;
  } catch (error) {
    console.error('❌ Failed to initialize AI service:', error);
    return null;
  }
};

const isOpenAIEnabled = () => {
  return openai !== null;
};

const getOpenAIClient = () => {
  if (!openai) {
    throw new Error('OpenAI is not initialized');
  }
  return openai;
};

// Generate summary using AI service
const generateSummary = async (messages, type = 'daily') => {
  try {
    if (!isOpenAIEnabled()) {
      throw new Error('AI service is not enabled');
    }

    // Determine prompt based on type
    const prompt = getPromptForType(type, messages);
    
    // Check token count and chunk if necessary
    const estimatedTokens = Math.ceil(messages.length * 1.5); // Rough estimation
    const maxTokens = 4000; // Leave room for response
    
    let processedMessages = messages;
    if (estimatedTokens > maxTokens) {
      processedMessages = chunkMessages(messages, maxTokens);
    }

    if (isXAI) {
      // Use xAI with direct fetch
      return await generateXAISummary(prompt, processedMessages, type);
    } else {
      // Use OpenAI SDK
      return await generateOpenAISummary(prompt, processedMessages, type);
    }

  } catch (error) {
    console.error('AI summary generation error:', error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
};

// Generate summary using xAI
const generateXAISummary = async (prompt, messages, type) => {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || 'grok-4-0709';
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes chat conversations. Provide concise, informative summaries that capture the key points, discussions, and important information from the chat.'
        },
        {
          role: 'user',
          content: prompt + '\n\n' + messages.join('\n')
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI API Error:', response.status, errorText);
    throw new Error(`xAI API Error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const summary = result.choices?.[0]?.message?.content || 'No summary generated';
  const tokens = result.usage?.total_tokens || 0;

  return {
    content: summary,
    tokens,
    model: model
  };
};

// Generate summary using OpenAI
const generateOpenAISummary = async (prompt, messages, type) => {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  const completion = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes chat conversations. Provide concise, informative summaries that capture the key points, discussions, and important information from the chat.'
      },
      {
        role: 'user',
        content: prompt + '\n\n' + messages.join('\n')
      }
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const summary = completion.choices[0]?.message?.content || 'No summary generated';
  const tokens = completion.usage?.total_tokens || 0;

  return {
    content: summary,
    tokens,
    model: model
  };
};

// Get appropriate prompt based on summary type
const getPromptForType = (type, messages) => {
  const basePrompt = 'Please provide a comprehensive summary of the following chat conversation.';
  
  switch (type) {
    case 'daily':
      return `${basePrompt} Focus on the main topics discussed, key decisions made, and important information shared throughout the day.`;
    case 'weekly':
      return `${basePrompt} Provide a weekly overview highlighting recurring themes, progress on ongoing discussions, and significant developments.`;
    case 'monthly':
      return `${basePrompt} Create a monthly summary focusing on major trends, completed projects, and strategic insights.`;
    case 'custom':
      return `${basePrompt} Analyze the conversation and provide insights based on the content and context.`;
    default:
      return basePrompt;
  }
};

// Chunk messages to fit within token limits
const chunkMessages = (messages, maxTokens) => {
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  for (const message of messages) {
    const messageTokens = Math.ceil(message.length * 1.5);
    
    if (currentTokens + messageTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [message];
      currentTokens = messageTokens;
    } else {
      currentChunk.push(message);
      currentTokens += messageTokens;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
};

// Generate summary for multiple chunks
const generateChunkedSummary = async (chunks, type) => {
  try {
    if (!isOpenAIEnabled()) {
      throw new Error('AI service is not enabled');
    }

    if (isXAI) {
      return await generateXAIChunkedSummary(chunks, type);
    } else {
      return await generateOpenAIChunkedSummary(chunks, type);
    }

  } catch (error) {
    console.error('Chunked summary generation error:', error);
    throw new Error(`Failed to generate chunked summary: ${error.message}`);
  }
};

// Generate chunked summary using xAI
const generateXAIChunkedSummary = async (chunks, type) => {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || 'grok-4-0709';
  
  // Generate summary for each chunk
  const chunkSummaries = [];
  for (const chunk of chunks) {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes chat conversations. Provide concise summaries that capture the key points.'
          },
          {
            role: 'user',
            content: `Please summarize this conversation chunk:\n\n${chunk}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content || '';
    chunkSummaries.push(summary);
  }

  // Generate final summary from chunk summaries
  const finalResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates comprehensive summaries from multiple conversation summaries.'
        },
        {
          role: 'user',
          content: `Please create a comprehensive summary from these conversation summaries:\n\n${chunkSummaries.join('\n\n')}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })
  });

  if (!finalResponse.ok) {
    const errorText = await finalResponse.text();
    throw new Error(`xAI API Error: ${finalResponse.status} ${errorText}`);
  }

  const finalResult = await finalResponse.json();
  const finalSummary = finalResult.choices?.[0]?.message?.content || 'No summary generated';
  const totalTokens = finalResult.usage?.total_tokens || 0;

  return {
    content: finalSummary,
    tokens: totalTokens,
    model: model
  };
};

// Generate chunked summary using OpenAI
const generateOpenAIChunkedSummary = async (chunks, type) => {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  // Generate summary for each chunk
  const chunkSummaries = [];
  for (const chunk of chunks) {
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes chat conversations. Provide concise summaries that capture the key points.'
        },
        {
          role: 'user',
          content: `Please summarize this conversation chunk:\n\n${chunk}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || '';
    chunkSummaries.push(summary);
  }

  // Generate final summary from chunk summaries
  const finalCompletion = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates comprehensive summaries from multiple conversation summaries.'
      },
      {
        role: 'user',
        content: `Please create a comprehensive summary from these conversation summaries:\n\n${chunkSummaries.join('\n\n')}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const finalSummary = finalCompletion.choices[0]?.message?.content || 'No summary generated';
  const totalTokens = finalCompletion.usage?.total_tokens || 0;

  return {
    content: finalSummary,
    tokens: totalTokens,
    model: model
  };
};

module.exports = {
  initializeOpenAI,
  isOpenAIEnabled,
  getOpenAIClient,
  generateSummary,
  generateChunkedSummary
};
