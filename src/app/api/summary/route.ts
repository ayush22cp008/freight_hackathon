import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

let cachedModelId: string | null = null;

async function getModelId(groq: Groq): Promise<string> {
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: driver } = await supabaseServer
      .from('drivers')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 401 });
    }

    const { tripId } = await request.json().catch(() => ({}));

    let query = supabaseServer
      .from('trips')
      .select('id')
      .eq('driver_id', driver.id)
      .in('status', ['active', 'claimed', 'in_progress', 'completed']);
      
    if (tripId) {
      query = query.eq('id', tripId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: trip } = await query.single();

    if (!trip) {
      return NextResponse.json({ error: 'No active trip found.' }, { status: 400 });
    }

    const { data: events } = await supabaseServer
      .from('events')
      .select('*')
      .eq('trip_id', trip.id)
      .order('server_timestamp', { ascending: true });

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events found.' }, { status: 400 });
    }

    const eventTypes = events.map(e => e.event_type);
    
    const hasArrival = eventTypes.includes('arrival') || eventTypes.includes('ARRIVED_AT_PICKUP');
    const hasCheckin = eventTypes.includes('checkin') || eventTypes.includes('PICKUP_CHECKED_IN');
    const hasDeparture = eventTypes.includes('departure') || eventTypes.includes('PICKUP_DEPARTED') || eventTypes.includes('DELIVERY_DEPARTED');
    
    if (!hasArrival || !hasCheckin || !hasDeparture) {
      return NextResponse.json({ error: 'Evidence summary requires the completed event sequence (Arrival, Check-in, Departure).' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI provider is not configured. Missing API key.' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const evidencePayload = events.map(e => ({
      type: e.event_type,
      server_timestamp: e.server_timestamp,
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

    // Disable reasoning if supported based on the instructions
    if (modelId.includes('qwen')) {
      generationParams.reasoning_effort = "none";
    }

    try {
      chatCompletion = await groq.chat.completions.create(generationParams);
    } catch (apiErr: any) {
      // Handle decommissioned or model error by clearing cache and retrying once
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
    
    // Sanitize: Remove <think>...</think> blocks including the tags
    let summary = rawSummary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!summary) {
      return NextResponse.json({ error: 'Empty response from AI after sanitization.' }, { status: 500 });
    }

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('AI Summary Error:', err);
    // Do not leak secrets in error message
    const errorMsg = err.message || 'An unexpected error occurred while generating the summary.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
