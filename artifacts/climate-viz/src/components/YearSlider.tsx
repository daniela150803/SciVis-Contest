interface Props {
  value: number;
  onChange: (year: number) => void;
}

const YEARS = Array.from({ length: 18 }, (_, i) => 2015 + i * 5);

export function YearSlider({ value, onChange }: Props) {
  return (
    <div className="px-5 py-3 border-b border-border/30 bg-muted/20">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-8 flex-shrink-0">Year</span>
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {YEARS.map((year) => {
            const isActive = year === value;
            return (
              <button
                key={year}
                onClick={() => onChange(year)}
                className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
        <span className="text-xs font-mono font-semibold text-primary w-10 flex-shrink-0 text-right">
          {value}
        </span>
      </div>
    </div>
  );
}
