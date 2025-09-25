import * as React from "react"
import { cn } from "@/lib/utils"

// Minimal theme map kept to preserve API, but no external dependencies
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// Replace Recharts dependency: children now accepts React.ReactNode directly.
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {/* Directly render children; no ResponsiveContainer dependency */}
        {children}
      </div>
    </ChartContext.Provider>
  )
}

// Keep style injection structure for compatibility; no-op if no colors provided
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => (cfg as any).theme || (cfg as any).color
  )
  if (!colorConfig.length) return null
  const css = Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      (itemConfig as any).theme?.[theme as keyof typeof THEMES] ||
      (itemConfig as any).color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`
    )
    .join("\n")

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

// Stub Tooltip and Legend components to avoid external chart library dependency.
const ChartTooltip: React.FC<any> = () => null

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  /* labelClassName removed */
  formatter,
  color,
  nameKey,
  labelKey,
  ...divProps
}: React.ComponentProps<"div"> & {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  active?: boolean
  payload?: Array<any>
  label?: React.ReactNode
  labelFormatter?: (value: any, payload?: Array<any>) => React.ReactNode
  labelClassName?: string
  formatter?: (...args: any[]) => React.ReactNode
  color?: string
}) {
  const { config } = useChart()

  // If not in an active charting context, render nothing.
  if (!active || !payload?.length) return null

  // Very lightweight generic tooltip to avoid runtime crashes.
  const title =
    !hideLabel && (typeof label === "string" || React.isValidElement(label))
      ? label
      : undefined

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
      {...divProps}
    >
      {title ? <div className={cn("font-medium")}>{title}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item?.name || item?.dataKey || "value"}`
          const itemConfig = (config as any)[key]
          const value =
            typeof item?.value !== "undefined" ? String(item.value) : ""
          return (
            <div key={item?.dataKey ?? index} className="flex w-full items-center gap-2">
              {!hideIndicator && (
                <div
                  className={cn("shrink-0 rounded-[2px]", {
                    "h-2.5 w-2.5": indicator === "dot",
                    "w-1 h-3": indicator === "line",
                  })}
                  style={{
                    backgroundColor: color || item?.payload?.fill || item?.color,
                  }}
                />
              )}
              <div className="flex flex-1 items-center justify-between leading-none">
                <span className="text-muted-foreground">
                  {itemConfig?.label || item?.name || key}
                </span>
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend: React.FC<any> = () => null

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
  ...divProps
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
  payload?: Array<any>
  verticalAlign?: "top" | "bottom" | "middle"
}) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
      {...divProps}
    >
      {payload.map((item, i) => {
        const key = `${nameKey || item?.dataKey || "value"}`
        const itemConfig = (config as any)[key]
        return (
          <div
            key={item?.value ?? i}
            className="flex items-center gap-1.5"
          >
            {!hideIcon ? (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item?.color }}
              />
            ) : null}
            {itemConfig?.label || item?.value || key}
          </div>
        )
      })}
    </div>
  )
}

// Helper preserved as-is (no external deps).
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof (payload as any).payload === "object" &&
    (payload as any).payload !== null
      ? (payload as any).payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof (payload as any)[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = (payload as any)[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? (config as any)[configLabelKey]
    : (config as any)[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}