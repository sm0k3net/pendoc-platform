import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

interface AIRequest {
  action: string;
  content: string;
  customPrompt?: string;
  fileType?: string;
  fileName?: string;
}

const getSystemPrompt = (action: string, fileType?: string, fileName?: string): string => {
  const baseContext = `You are a cybersecurity expert AI assistant helping penetration testers analyze and document their findings. The current file is "${fileName || 'unknown'}" of type "${fileType || 'text'}".`;
  
  switch (action) {
    case 'summarize':
      return `${baseContext} Provide a concise, professional summary of the following content. Focus on key findings, vulnerabilities, and actionable insights.`;
    
    case 'report':
      return `${baseContext} Transform the following content into a professional penetration testing report format. Include sections for: Executive Summary, Findings, Risk Assessment, and Recommendations. Use clear headings and bullet points.`;

    case 'description':
      return `${baseContext} Transform the following content into a well-structured, professional vulnerability description. Include: Summary, Affected Components, Attack Vector, Impact, Reproduction Steps, and Notes. Use clear headings and concise bullets.`;

    case 'vulnerabilities':
      return `${baseContext} Analyze the following content and identify potential security vulnerabilities. For each vulnerability found, provide: severity level (Critical/High/Medium/Low/Info), description, potential impact, and remediation recommendations.`;
    
    case 'cvss':
      return `${baseContext} Analyze the following security findings and calculate CVSS 3.1 scores for each vulnerability identified. Provide the vector string and score breakdown.`;
    
    case 'remediation':
      return `${baseContext} Based on the following security findings, provide detailed remediation steps and best practices. Prioritize by severity and include specific technical guidance.`;
    
    case 'executive':
      return `${baseContext} Create an executive summary suitable for non-technical stakeholders. Focus on business impact, risk levels, and high-level recommendations without technical jargon.`;
    
    case 'timeline':
      return `${baseContext} Analyze the following penetration test data and create a timeline of events. Include timestamps, actions taken, and findings discovered during the assessment.`;
    
    case 'custom':
      return `${baseContext} You are assisting with a penetration testing documentation task.`;
    
    default:
      return baseContext;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication: require valid Supabase JWT ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const { action, content, customPrompt, fileType, fileName }: AIRequest = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    console.log('AI writing request received');

    const systemPrompt = getSystemPrompt(action, fileType, fileName);
    const userMessage = action === 'custom' && customPrompt 
      ? `${customPrompt}\n\nContent to analyze:\n${content}`
      : `Please analyze the following content:\n\n${content}`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PenDoc AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    console.log('AI Assistant: Response generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        action,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
