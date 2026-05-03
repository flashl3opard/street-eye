let lastPayload = null;
let lastReceivedAt = null;

export function setHardwarePayload(payload) {
    lastPayload = payload;
    lastReceivedAt = Date.now();
}

export function getHardwarePayload() {
    if (!lastPayload) return null;
    return { ...lastPayload, lastReceivedAt };
}
