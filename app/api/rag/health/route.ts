import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rag/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'degraded', error: response.statusText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'offline',
        service: 'scientific-rag-backend',
        error: (error as Error).message,
        components: {
          vectorStore: 'unreachable',
          llm: 'unreachable',
          gpu: null,
        },
      },
      { status: 503 },
    );
  }
}
