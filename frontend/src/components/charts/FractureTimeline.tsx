import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { useKronos } from "../../hooks/useKronos";
import type { HistoryPoint, KronosEvent } from "../../types/kronos";

interface ChartDatum {
  minute: number;
  fracture: number;
  chaos: number;
  event?: { severity: string; message: string };
}

interface EventMarker {
  minute: number;
  severity: "WARNING" | "CRITICAL";
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const datum: ChartDatum | undefined = payload[0]?.payload;
  return (
    <div className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-xs font-mono text-gray-200 max-w-56">
      <div className="text-gray-500 mb-1">Minute: {label}</div>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </div>
      ))}
      {datum?.event && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-700">
          <div className="text-gray-500 text-[10px] mb-0.5">Event</div>
          <div
            className={
              datum.event.severity === "CRITICAL" ? "text-red-400" : "text-yellow-400"
            }
          >
            {datum.event.message}
          </div>
        </div>
      )}
    </div>
  );
}

const lineStyle = { strokeWidth: 1.5 };

export function FractureTimeline() {
  const { history, events } = useKronos();

  const markers: EventMarker[] = useMemo(() => {
    const filtered = events.filter(
      (e: KronosEvent) => e.severity === "CRITICAL" || e.severity === "WARNING",
    );
    const best: Record<number, KronosEvent> = {};
    for (const ev of filtered) {
      const cur = best[ev.minute];
      if (!cur || (ev.severity === "CRITICAL" && cur.severity === "WARNING")) {
        best[ev.minute] = ev;
      }
    }
    return Object.values(best).map((ev) => ({
      minute: ev.minute,
      severity: ev.severity as "WARNING" | "CRITICAL",
      message: ev.message,
    }));
  }, [events]);

  const eventLookup: Record<number, { severity: string; message: string }> = useMemo(
    () => Object.fromEntries(markers.map((m) => [m.minute, { severity: m.severity, message: m.message }])),
    [markers],
  );

  const data: ChartDatum[] = useMemo(
    () =>
      history.map((p: HistoryPoint) => ({
        minute: p.minute,
        fracture: p.fracture,
        chaos: p.chaos,
        event: eventLookup[p.minute],
      })),
    [history, eventLookup],
  );

  const hasCritical = markers.some((m) => m.severity === "CRITICAL");
  const hasWarning = markers.some((m) => m.severity === "WARNING");

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="text-xs tracking-widest text-gray-500 mb-1">
        FRACTURE TIMELINE
      </div>
      <div className="text-[10px] text-gray-600 mb-4">
        Instability progression over match lifecycle
      </div>

      {data.length < 2 ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          Awaiting sufficient historical data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="minute"
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              label={{
                value: "Minute",
                position: "insideBottomRight",
                offset: -4,
                style: { fill: "#9CA3AF", fontSize: 11 },
              }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              label={{
                value: "Intensity",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                style: { fill: "#9CA3AF", fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="fracture"
              stroke="#6366F1"
              name="Fracture"
              {...lineStyle}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="chaos"
              stroke="#F59E0B"
              name="Chaos"
              {...lineStyle}
              dot={false}
            />
            {markers.map((m) => (
              <ReferenceDot
                key={`${m.minute}-${m.severity}`}
                x={m.minute}
                y={96}
                fill={m.severity === "CRITICAL" ? "#EF4444" : "#EAB308"}
                stroke="none"
                r={3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-px bg-indigo-400" />
          Fracture
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-px bg-amber-400" />
          Chaos
        </span>
        {hasCritical && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Critical Event
          </span>
        )}
        {hasWarning && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            Warning Event
          </span>
        )}
      </div>
    </div>
  );
}
