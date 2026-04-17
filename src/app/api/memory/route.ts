import { NextRequest, NextResponse } from 'next/server';
import { getAllMemories, deleteMemory, clearAllMemories } from '@/lib/build-memory';

/** GET /api/memory — list all build memory entries */
export async function GET() {
  const memories = getAllMemories();
  return NextResponse.json({ memories });
}

/** DELETE /api/memory?id=<id>  — delete one entry
 *  DELETE /api/memory           — clear all entries */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const ok = deleteMemory(id);
    return NextResponse.json({ ok });
  }
  clearAllMemories();
  return NextResponse.json({ ok: true, cleared: true });
}
