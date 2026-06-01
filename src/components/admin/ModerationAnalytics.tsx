"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

import { Flag, Clock, UserX, AlertTriangle } from "lucide-react";
import { ModerationAnalyticsStats } from "@/types";

interface AnalyticsProps {
  stats: ModerationAnalyticsStats;
}

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function ModerationAnalytics({ stats }: AnalyticsProps) {
  // Normalize chart data safely
  const flagsPerDay = stats.flagsPerDay.map((item) => ({
    date: item.date,
    count: Number(item.count ?? 0),
  }));

  const violationCategories = stats.violationCategories.map((item) => ({
    name: item.name,
    value: Number(item.value ?? 0),
  }));

  console.log("flagsPerDay:", JSON.stringify(flagsPerDay, null, 2));

  console.log(
    "violationCategories:",
    JSON.stringify(violationCategories, null, 2),
  );

  return (
    <div className="space-y-6 mb-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>

            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlags}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reviews
            </CardTitle>

            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>

            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{stats.blockedUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flags Today</CardTitle>

            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{stats.flagsToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Flags Per Day */}

        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Flags Per Day
                </CardTitle>

                <CardDescription>
                  Daily moderation activity overview
                </CardDescription>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-center rounded-xl border border-border/50 bg-black/20 p-4">
              <BarChart width={500} height={280} data={flagsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />

                <XAxis
                  dataKey="date"
                  stroke="#a1a1aa"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis stroke="#a1a1aa" tickLine={false} axisLine={false} />

                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />

                <Bar
                  dataKey="count"
                  radius={[10, 10, 0, 0]}
                  fill="url(#flagsGradient)"
                />

                <defs>
                  <linearGradient
                    id="flagsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />

                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </BarChart>
            </div>
          </CardContent>
        </Card>

        {/* Violation Categories */}

        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Violation Categories
                </CardTitle>

                <CardDescription>
                  Distribution of moderation reasons
                </CardDescription>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-center rounded-xl border border-border/50 bg-black/20 p-4">
              <PieChart width={500} height={280}>
                <Pie
                  data={violationCategories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {violationCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#09090b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Section */}
      <div className="hidden">
        <pre>{JSON.stringify(flagsPerDay, null, 2)}</pre>

        <pre>{JSON.stringify(violationCategories, null, 2)}</pre>
      </div>
    </div>
  );
}
