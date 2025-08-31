const OpenAI = require('openai');

let openai = null;

const initializeOpenAI = () => {
  if (openai) {
    return openai;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️ OpenAI API key not found. AI summary feature will be disabled.');
    return null;
  }

  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('✅ OpenAI initialized successfully');
    return openai;
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error);
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

// Generate summary using OpenAI
const generateSummary = async (messages, type = 'daily') => {
  try {
    if (!isOpenAIEnabled()) {
      throw new Error('OpenAI is not enabled');
    }

    const client = getOpenAIClient();
    
    // Determine prompt based on type
    const prompt = getPromptForType(type, messages);
    
    // Check token count and chunk if necessary
    const estimatedTokens = Math.ceil(messages.length * 1.5); // Rough estimation
    const maxTokens = 4000; // Leave room for response
    
    let processedMessages = messages;
    if (estimatedTokens > maxTokens) {
      processedMessages = chunkMessages(messages, maxTokens);
    }

    // Generate summary
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes chat conversations. Provide concise, informative summaries that capture the key points, discussions, and important information from the chat.'
        },
        {
          role: 'user',
          content: prompt + '\n\n' + processedMessages.join('\n')
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
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    };

  } catch (error) {
    console.error('OpenAI summary generation error:', error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
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
      throw new Error('OpenAI is not enabled');
    }

    const client = getOpenAIClient();
    
    // Generate summary for each chunk
    const chunkSummaries = [];
    for (const chunk of chunks) {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    };

  } catch (error) {
    console.error('Chunked summary generation error:', error);
    throw new Error(`Failed to generate chunked summary: ${error.message}`);
  }
};

module.exports = {
  initializeOpenAI,
  isOpenAIEnabled,
  getOpenAIClient,
  generateSummary,
  generateChunkedSummary
};
