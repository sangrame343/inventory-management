"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

interface DashboardChartsProps {
  statusData: { name: string; value: number }[];
  categoryData: { name: string; value: number }[];
}

export function DashboardCharts({ statusData, categoryData }: DashboardChartsProps) {
  const hasStatusData = statusData.length > 0;
  const hasCategoryData = categoryData.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Asset Status Distribution */}
      <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Asset Status Distribution</CardTitle>
          <CardDescription>Breakdown of assets by their current operational state</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No status data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets by Category */}
      <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Assets by Category</CardTitle>
          <CardDescription>Top asset categories by count</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  fontSize={11} 
                  stroke="hsl(var(--muted-foreground))" 
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No category data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
