import Groq from 'groq-sdk';

let cachedModelId: string | null = null;

export async function getModelId(groq: Groq): Promise<string> {
  if (cachedModelId) return cachedModelId;
  
  const modelsPage = await groq.models.list();
  const models = modelsPage.data || [];
  
  const textModels = models.filter(m => 
    !m.id.includes('guard') && 
    !m.id.includes('whisper') &&
    !m.id.includes('vision')
  );
  
  const suitableModel = textModels.find(m => m.id.includes('llama')) || 
                        textModels.find(m => m.id.includes('mixtral')) || 
                        textModels.find(m => m.id.includes('gemma')) || 
                        textModels.find(m => m.id.includes('qwen')) || 
                        textModels.find(m => m.id.includes('gpt')) || 
                        textModels[0];

  if (!suitableModel) {
    throw new Error('No suitable active free-tier text generation model found from Groq.');
  }

  cachedModelId = suitableModel.id;
  return cachedModelId;
}

export async function generateSummaryForEvents(events: any[]): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('AI provider is not configured. Missing API key.');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const evidencePayload = events.map(e => ({
    type: e.event_type,
    server_timestamp: e.server_timestamp || e.timestamp,
    latitude: e.latitude,
    longitude: e.longitude,
    gps_accuracy: e.gps_accuracy,
    photo_provided: !!e.photo_url
  }));

  const systemPrompt = `You are a factual summarization AI for Freight trips. 
You will be provided with a JSON array of chronological trip events.
Your task is to generate a concise, factual summary of the trip based ONLY on the provided structured data.

CRITICAL RULES:
1. Summarize ONLY facts present in the data.
2. Do not infer intent, blame, causality, or unsupported conclusions.
3. Preserve the event sequence and recorded timestamps/locations accurately.
4. Describe photo evidence as "provided" or "not provided". Do not invent visual details.
5. Do not invent any details not present in the data.
6. Output ONLY the final factual summary. Do not output analysis, reasoning traces, <think> tags, checklists, or descriptions of your own generation process.`;

  let modelId = await getModelId(groq);
  let chatCompletion;

  const generationParams: any = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(evidencePayload) }
    ],
    model: modelId,
    max_tokens: 2048,
  };

  if (modelId.includes('qwen')) {
    generationParams.reasoning_effort = "none";
  }

  try {
    chatCompletion = await groq.chat.completions.create(generationParams);
  } catch (apiErr: any) {
    if (apiErr?.error?.message?.toLowerCase().includes('decommissioned') || apiErr?.status === 404 || apiErr?.status === 400) {
      cachedModelId = null;
      modelId = await getModelId(groq);
      generationParams.model = modelId;
      if (modelId.includes('qwen')) {
        generationParams.reasoning_effort = "none";
      } else {
        delete generationParams.reasoning_effort;
      }
      chatCompletion = await groq.chat.completions.create(generationParams);
    } else {
      throw apiErr;
    }
  }

  let rawSummary = chatCompletion.choices[0]?.message?.content || '';
  let summary = rawSummary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (!summary) {
    throw new Error('Empty response from AI after sanitization.');
  }

  return summary;
}
