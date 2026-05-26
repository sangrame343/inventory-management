"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface ActivityFilters {
  search: string;
  module: string;
  action: string;
  period: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onFilterChange: (filters: ActivityFilters) => void;
}

export function ActivityFilters({ filters, onFilterChange }: ActivityFiltersProps) {
  const handleChange = (key: keyof ActivityFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activity..."
          value={filters.search}
          onChange={(e) => handleChange("search", e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>
      
      <Select value={filters.module} onValueChange={(v) => handleChange("module", v ?? "")}>
        <SelectTrigger className="w-[110px] h-9 text-xs">
          <SelectValue placeholder="Module" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modules</SelectItem>
          <SelectItem value="asset">Asset</SelectItem>
          <SelectItem value="inventory">Inventory</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.action} onValueChange={(v) => handleChange("action", v ?? "")}>
        <SelectTrigger className="w-[110px] h-9 text-xs">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
          <SelectItem value="assign">Assign</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.period} onValueChange={(v) => handleChange("period", v ?? "")}>
        <SelectTrigger className="w-[100px] h-9 text-xs">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7d</SelectItem>
          <SelectItem value="30d">Last 30d</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
