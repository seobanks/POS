"use client";

import { useState } from "react";
import {
  Calendar,
  CloudLightning,
  CloudRain,
  CloudSun,
  Flame,
  Info,
  Lightbulb,
  Sparkles,
  Sun,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import {
  useDemandForecast,
  type ForecastDay,
} from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeatherDemandForecastCard() {
  const { branchId } = useBranch();
  const { data: forecast, isLoading } = useDemandForecast(branchId);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  if (isLoading) {
    return (
      <Card className="p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!forecast || !forecast.forecastDays || forecast.forecastDays.length === 0) {
    return null;
  }

  const selectedDay: ForecastDay = forecast.forecastDays[selectedDayIndex] || forecast.forecastDays[0];

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case "sun":
        return <Sun className="h-5 w-5 text-amber-500" />;
      case "cloud-rain":
        return <CloudRain className="h-5 w-5 text-blue-500" />;
      case "cloud-lightning":
        return <CloudLightning className="h-5 w-5 text-purple-500" />;
      default:
        return <CloudSun className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <Card className="p-6 rounded-2xl border border-border shadow-xs bg-card space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                AI Weather & Event Demand Forecast
              </h3>
              <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                7-Day Predictive Horizon
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Correlates local weather forecasts, historical day-of-week patterns, and calendar events to forecast revenue & staffing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span>Baseline: <strong>{formatCurrency(forecast.baselineDailyRevenue)}/day</strong></span>
          <span>Avg Covers: <strong>{forecast.baselineDailyCovers}/day</strong></span>
        </div>
      </div>

      {/* 7-Day Horizontal Timeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {forecast.forecastDays.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const isRainy = day.weather.rainProb > 50;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDayIndex(idx)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative group",
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border/80 bg-secondary/20 hover:border-border hover:bg-secondary/40",
              )}
            >
              <div>
                {/* Date & Day Header */}
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
                    {idx === 0 ? "Today" : day.dayName.slice(0, 3)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {day.date.slice(5)}
                  </span>
                </div>

                {/* Weather Pill */}
                <div className="flex items-center gap-1.5 mt-2">
                  {getWeatherIcon(day.weather.icon)}
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-foreground block">
                      {day.weather.tempHigh}°/{day.weather.tempLow}°
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {day.weather.condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forecast Numbers */}
              <div className="space-y-1 pt-2 border-t border-border/50">
                <span className="text-xs font-bold font-mono text-foreground block tabular-nums">
                  {formatCurrency(day.predictedRevenue.expected)}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono block">
                  👥 {day.predictedCovers} covers · {day.predictedOrders} ord
                </span>

                {isRainy && (
                  <span className="inline-block text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-1">
                    🌧️ {day.weather.rainProb}% Rain
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Deep Dive: Smart AI Kitchen & Staffing Advisor */}
      {selectedDay && (
        <div className="rounded-2xl border border-primary/20 bg-secondary/30 p-4.5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">
                Operational Intelligence for {selectedDay.dayName} ({selectedDay.date}) — {selectedDay.event}
              </h4>
            </div>

            <Badge variant="outline" className="text-xs font-mono">
              Weather Impact: {selectedDay.weather.impact}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Advice 1: Kitchen Prep */}
            <div className="rounded-xl border bg-card p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Utensils className="h-3.5 w-3.5 text-amber-500" />
                <span>Kitchen Prep Directive</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedDay.kitchenPrepAdvice}
              </p>
            </div>

            {/* Advice 2: Channel Split */}
            <div className="rounded-xl border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-500" />
                  <span>Channel Demand Mix</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Dine-in {selectedDay.channelSplit.dineInPct}% · Delivery {selectedDay.channelSplit.deliveryPct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary flex overflow-hidden">
                <div
                  className="bg-orange-500 h-full"
                  style={{ width: `${selectedDay.channelSplit.dineInPct}%` }}
                  title={`Dine-in ${selectedDay.channelSplit.dineInPct}%`}
                />
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${selectedDay.channelSplit.deliveryPct}%` }}
                  title={`Delivery ${selectedDay.channelSplit.deliveryPct}%`}
                />
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${selectedDay.channelSplit.takeawayPct}%` }}
                  title={`Takeaway ${selectedDay.channelSplit.takeawayPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Dine-In</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Delivery</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Takeaway</span>
              </div>
            </div>

            {/* Advice 3: Staffing Roster Recommendation */}
            <div className="rounded-xl border bg-card p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                <span>Roster Recommendation</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center pt-1 font-mono text-xs">
                <div className="bg-secondary/40 rounded-lg p-1.5 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Floor</span>
                  <strong className="text-foreground">{selectedDay.recommendedStaffing.serviceStaff}</strong>
                </div>
                <div className="bg-secondary/40 rounded-lg p-1.5 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Kitchen</span>
                  <strong className="text-foreground">{selectedDay.recommendedStaffing.kitchenStaff}</strong>
                </div>
                <div className="bg-secondary/40 rounded-lg p-1.5 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Riders</span>
                  <strong className="text-foreground">{selectedDay.recommendedStaffing.deliveryDrivers}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
