import { register } from '@/lib/metrics';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (err) {
    return new NextResponse(String(err), { status: 500 });
  }
}
