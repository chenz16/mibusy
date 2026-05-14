import { sessionStates } from "../lib/ui-data";

export function StatusBadge({ state }: { state: string }) {
  const entry = sessionStates.find((item) => item.key === state);
  const Icon = entry?.icon;

  return (
    <span className={`badge ${state}`}>
      {Icon ? <Icon size={13} /> : null}
      {entry?.label ?? state}
    </span>
  );
}

