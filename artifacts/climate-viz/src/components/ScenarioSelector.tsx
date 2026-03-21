interface Scenario {
  id: string;
  name: string;
  description: string;
  warming: string;
}

interface Props {
  scenarios: Scenario[];
  value: string;
  onChange: (id: string) => void;
}

const SCENARIO_COLORS: Record<string, string> = {
  ssp126: "#22c55e",
  ssp245: "#f59e0b",
  ssp370: "#f97316",
  ssp585: "#ef4444",
};

export function ScenarioSelector({ scenarios, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-lg p-1">
      {scenarios.map((s) => {
        const isActive = s.id === value;
        const color = SCENARIO_COLORS[s.id] ?? "#6b7280";
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            title={s.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-card text-foreground border border-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {s.id.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
