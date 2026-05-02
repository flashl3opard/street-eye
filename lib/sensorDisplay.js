/**
 * Sensor display helpers — keep "what number do I show?" logic in one place
 * so every page renders the same dashes when Arduino is disconnected.
 */

export const SENSOR_PLACEHOLDER = '--';

/**
 * Format a sensor value, returning placeholder dashes when no live link.
 *
 * @param {number|null|undefined} value
 * @param {object} opts
 * @param {boolean} opts.connected  — Arduino live? when false → "--"
 * @param {(v:number)=>string} [opts.format] — formatter for live numbers
 * @param {string} [opts.unit] — appended to live values only
 * @param {string} [opts.placeholder] — override "--"
 */
export function formatSensorValue(value, { connected, format, unit = '', placeholder = SENSOR_PLACEHOLDER } = {}) {
    if (!connected || value === null || value === undefined || Number.isNaN(value)) {
        return unit ? `${placeholder}${unit ? ' ' + unit : ''}` : placeholder;
    }
    const formatted = format ? format(value) : String(value);
    return unit ? `${formatted}${unit}` : formatted;
}
