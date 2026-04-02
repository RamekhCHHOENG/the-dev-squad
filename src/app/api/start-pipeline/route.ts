import { NextRequest, NextResponse } from 'next/server';
import { startPipelineRun } from '@/lib/pipeline-control';

export async function POST(req: NextRequest) {
  let securityMode = 'fast';
  let runGoal = 'full-build';
  try {
    const body = await req.json();
    if (body?.securityMode === 'strict') securityMode = 'strict';
    if (body?.runGoal === 'plan-only') runGoal = 'plan-only';
  } catch {}

  const result = startPipelineRun({
    securityMode: securityMode === 'strict' ? 'strict' : 'fast',
    runGoal: runGoal === 'plan-only' ? 'plan-only' : 'full-build',
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || 'Could not start pipeline' });
  }

  return NextResponse.json(result);
}
