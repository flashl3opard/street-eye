import { getHardwarePayload } from '../../lib/hardwareStore';

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
