import { getHardwarePayload, setHardwarePayload } from '../../../lib/hardwareStore';

export async function GET() {
    const payload = getHardwarePayload();
    if (!payload) {
        return Response.json({ error: 'No hardware data yet.' }, { status: 503 });
    }

    return Response.json(payload, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
    });
}

export async function POST(request) {
    const payload = await request.json();
    setHardwarePayload(payload);

    return Response.json({ ok: true }, { status: 200 });
}
