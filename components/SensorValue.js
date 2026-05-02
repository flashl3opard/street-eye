'use client';
import { formatSensorValue } from '../lib/sensorDisplay';

/**
 * SensorValue — render a single sensor reading with consistent offline handling.
 *
 * Renders dashes ("--") when `connected` is false. The wrapping <span> always
 * carries `.sensor-value` so updates animate via the CSS transition.
 */
export default function SensorValue({
    value,
    connected,
    format,
    unit = '',
    placeholder = '--',
    className = '',
    style,
    title,
}) {
    const text = formatSensorValue(value, { connected, format, unit, placeholder });
    return (
        <span
            className={`sensor-value${connected ? '' : ' sensor-value-off'} ${className}`.trim()}
            style={style}
            title={title}
        >
            {text}
        </span>
    );
}
