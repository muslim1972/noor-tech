// src/app/api/meeting/tracks/route.ts
// إدارة الـ tracks: pull من مشاركين آخرين + renegotiate
import { NextResponse } from 'next/server';
import { addTracks, renegotiateSession } from '@/lib/cloudflare';

/**
 * POST: سحب tracks من مشاركين آخرين (Pull)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, tracks } = body;

    if (!sessionId || !tracks || !tracks.length) {
      return NextResponse.json(
        { error: 'sessionId و tracks مطلوبان' },
        { status: 400 }
      );
    }

    // Pull tracks من sessions أخرى
    const pullResult = await addTracks(sessionId, {
      tracks: tracks.map((t: any) => ({
        location: 'remote' as const,
        trackName: t.trackName,
        sessionId: t.sessionId,
      })),
    });

    return NextResponse.json({
      success: true,
      sdpOffer: pullResult?.sessionDescription?.sdp || null,
      tracks: pullResult?.tracks || [],
      requiresImmediateRenegotiation:
        pullResult?.requiresImmediateRenegotiation || false,
    });
  } catch (error: any) {
    console.error('Pull Tracks Error:', error);
    return NextResponse.json(
      { error: 'فشل سحب tracks', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: إعادة تفاوض الجلسة (renegotiate)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, sdpAnswer } = body;

    if (!sessionId || !sdpAnswer) {
      return NextResponse.json(
        { error: 'sessionId و sdpAnswer مطلوبان' },
        { status: 400 }
      );
    }

    const result = await renegotiateSession(sessionId, {
      sessionDescription: {
        type: 'answer',
        sdp: sdpAnswer,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Renegotiate Error:', error);
    return NextResponse.json(
      { error: 'فشل التفاوض', details: error.message },
      { status: 500 }
    );
  }
}
