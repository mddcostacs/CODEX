import { Search } from "lucide-react";

export function Toolbar({
  search,
  onSearch,
  filter,
  onFilter,
  options
}: {
  search: string;
  onSearch: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row">
      <label className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar registros"
          className="h-11 w-full rounded-lg border border-line pl-10 pr-3 outline-none focus:border-brand-500"
        />
      </label>
      <select
        value={filter}
        onChange={(event) => onFilter(event.target.value)}
        className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand-500 md:w-56"
      >
        {options.map((option) => (
          <option key={option || "all"} value={option}>{option || "Todos"}</option>
        ))}
      </select>
    </div>
  );
}
