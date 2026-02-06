<script lang="ts" module>
    // Re-export ColorContext type for external use
    export type { ColorContext, SeriesColorKey } from "$lib/utils/colorUtils";
</script>

<script lang="ts">
    import * as echarts from "echarts";
    import { onMount, onDestroy } from "svelte";
    import type { BenchmarkResult } from "$lib/utils/data";
    import { groupBySeries } from "$lib/utils/data";
    import { getHierarchicalColor, type ColorContext } from "$lib/utils/colorUtils";

    interface Props {
        data: BenchmarkResult[];
        xField: "n_prompt" | "n_gen";
        title: string;
        logScale?: boolean;
        visibleSeries?: Set<string>;
        colorContext: ColorContext;
    }

    let { data, xField, title, logScale = true, visibleSeries, colorContext }: Props = $props();

    let chartContainer: HTMLDivElement;
    let chart: echarts.ECharts | null = null;
    let isChartReady = $state(false);

    // Animation configuration
    const ANIMATION_DURATION = 1000;
    const ANIMATION_DURATION_UPDATE = 500;
    const ANIMATION_EASING = "cubicOut" as const;
    const ANIMATION_EASING_UPDATE = "cubicInOut" as const;
    const STAGGER_DELAY = 40;

    function buildChartOption() {
        const groups = groupBySeries(data);
        const series: echarts.SeriesOption[] = [];
        const allXValues = new Set<number>();

        // Store benchmark data for tooltip lookup
        const dataLookup = new Map<string, BenchmarkResult>();

        // Use provided context
        const ctx = colorContext;

        let seriesIndex = 0;

        for (const [name, items] of groups) {
            // Skip if this series is not visible (when visibleSeries is provided)
            const isVisible = !visibleSeries || visibleSeries.has(name);

            // Get first item to build color key
            const sample = items[0];
            const colorKey = {
                model: sample.model_type,
                gpu: sample.gpu_info,
                backend: sample.backends,
                depth: sample.n_depth,
                kvType: `${sample.type_k}/${sample.type_v}`,
            };
            const color = getHierarchicalColor(colorKey, ctx);

            if (!isVisible) continue;

            const sortedItems = [...items].sort((a, b) => a[xField] - b[xField]);

            // Store each item for tooltip lookup
            sortedItems.forEach((d) => {
                const key = `${name}-${d[xField]}`;
                dataLookup.set(key, d);
            });

            const chartData = sortedItems.map((d) => {
                allXValues.add(d[xField]);
                return {
                    value: [d[xField], d.avg_ts],
                    itemData: d, // Store full data for tooltip
                };
            });

            // Main line with staggered animation
            series.push({
                name,
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 8,
                data: chartData,
                itemStyle: { color },
                lineStyle: { width: 2.5 },
                emphasis: {
                    focus: "series",
                    itemStyle: { borderWidth: 3 },
                },
                // Entrance animation
                animationDuration: ANIMATION_DURATION,
                animationDelay: seriesIndex * STAGGER_DELAY,
                animationEasing: ANIMATION_EASING,
                // Update animation (when data/visibility changes)
                animationDurationUpdate: ANIMATION_DURATION_UPDATE,
                animationDelayUpdate: seriesIndex * (STAGGER_DELAY / 2),
                animationEasingUpdate: ANIMATION_EASING_UPDATE,
            });

            seriesIndex++;

            // Error bars (using custom series)
            const errorData = sortedItems.map((d) => [d[xField], d.avg_ts, d.stddev_ts]);
            series.push({
                name: `${name} (stddev)`,
                type: "custom",
                renderItem: (_params, api) => {
                    const xValue = api.value(0);
                    const yValue = api.value(1) as number;
                    const stddev = api.value(2) as number;
                    const point = api.coord([xValue, yValue]);
                    const highPoint = api.coord([xValue, yValue + stddev]);
                    const lowPoint = api.coord([xValue, yValue - stddev]);

                    return {
                        type: "group",
                        children: [
                            {
                                type: "line",
                                shape: { x1: point[0], y1: highPoint[1], x2: point[0], y2: lowPoint[1] },
                                style: { stroke: color, lineWidth: 1.5 },
                            },
                            {
                                type: "line",
                                shape: { x1: point[0] - 4, y1: highPoint[1], x2: point[0] + 4, y2: highPoint[1] },
                                style: { stroke: color, lineWidth: 1.5 },
                            },
                            {
                                type: "line",
                                shape: { x1: point[0] - 4, y1: lowPoint[1], x2: point[0] + 4, y2: lowPoint[1] },
                                style: { stroke: color, lineWidth: 1.5 },
                            },
                        ],
                    };
                },
                data: errorData,
                z: 5,
            });
        }

        const sortedXValues = [...allXValues].sort((a, b) => a - b);

        return {
            backgroundColor: "transparent",
            title: {
                text: title,
                left: "center",
                top: 10,
                textStyle: {
                    color: "#e0e0e0",
                    fontSize: 18,
                    fontWeight: 600,
                },
            },
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(30, 30, 46, 0.98)",
                borderColor: "#45475a",
                borderWidth: 1,
                padding: [12, 16],
                textStyle: { color: "#cdd6f4", fontSize: 13 },
                extraCssText: "max-width: 400px; white-space: normal;",
                formatter: (params: any) => {
                    // Skip stddev series
                    if (params.seriesName?.includes("stddev")) return "";

                    const itemData = params.data?.itemData as BenchmarkResult | undefined;
                    if (!itemData) {
                        return `${params.marker} ${params.seriesName}: <strong>${params.value[1]?.toFixed(2)}</strong> t/s`;
                    }

                    const xLabel = xField === "n_prompt" ? "Prompt" : "Generation";
                    const speed = itemData.avg_ts.toFixed(2);
                    const stddev = itemData.stddev_ts.toFixed(2);
                    const variance = (itemData.stddev_ts ** 2).toFixed(4);

                    return `
                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #45475a; padding-bottom: 6px;">
                            ${params.marker} ${params.seriesName}
                        </div>
                        <div style="margin-bottom: 8px;">
                            <div style="color: #89b4fa; font-size: 18px; font-weight: 600;">
                                ${speed} ± ${stddev} <span style="font-size: 12px; color: #a6adc8;">t/s</span>
                            </div>
                            <div style="color: #6c7086; font-size: 11px;">Variance: ${variance}</div>
                        </div>
                        <div style="font-size: 11px; color: #a6adc8; line-height: 1.6;">
                            <div><span style="color: #6c7086;">[${xLabel.toUpperCase()}]</span> ${itemData[xField]} tokens</div>
                            <div><span style="color: #6c7086;">[MODEL]</span> ${itemData.model_type}</div>
                            <div><span style="color: #6c7086;">[GPU]</span> ${itemData.gpu_info}</div>
                            <div><span style="color: #6c7086;">[BACKEND]</span> ${itemData.backends}</div>
                            <div><span style="color: #6c7086;">[CACHE]</span> ${itemData.type_k}/${itemData.type_v}</div>
                            <div><span style="color: #6c7086;">[DEPTH]</span> ${itemData.n_depth ?? "N/A"}</div>
                            <div><span style="color: #6c7086;">[BATCH]</span> ${itemData.n_batch}/${itemData.n_ubatch}</div>
                        </div>
                    `.trim();
                },
            },
            legend: {
                show: false, // Using custom ChartLegend component instead
            },
            grid: {
                left: 60,
                right: 30,
                top: 60,
                bottom: 80,
            },
            xAxis: {
                type: logScale ? "log" : "value",
                name: xField === "n_prompt" ? "Prompt Length (tokens)" : "Generation Length (tokens)",
                nameLocation: "middle",
                nameGap: 35,
                nameTextStyle: { color: "#a6adc8", fontSize: 13 },
                axisLine: { lineStyle: { color: "#45475a" } },
                axisLabel: {
                    color: "#a6adc8",
                    formatter: (value: number) => Math.round(value).toString(),
                },
                splitLine: { show: false },
                min: logScale ? "dataMin" : undefined,
                logBase: 2,
            },
            yAxis: {
                type: "value",
                scale: true,
                name: "Speed (tokens/sec)",
                nameLocation: "middle",
                nameGap: 45,
                nameTextStyle: { color: "#a6adc8", fontSize: 13 },
                axisLine: { lineStyle: { color: "#45475a" } },
                axisLabel: { color: "#a6adc8" },
                splitLine: { lineStyle: { color: "#313244", type: "dashed" } },
            },
            // Global animation settings
            animation: true,
            animationThreshold: 20000,
            animationDuration: ANIMATION_DURATION,
            animationEasing: ANIMATION_EASING,
            animationDurationUpdate: ANIMATION_DURATION_UPDATE,
            animationEasingUpdate: ANIMATION_EASING_UPDATE,
            series,
        };
    }

    function updateChart() {
        if (chart && data.length > 0) {
            // Use replaceMerge for series to enable smooth add/remove transitions
            // This preserves animation state for unchanged series while animating changes
            chart.setOption(buildChartOption(), {
                replaceMerge: ["series"],
                lazyUpdate: false,
            });
        }
    }

    onMount(() => {
        chart = echarts.init(chartContainer, "dark");
        isChartReady = true;

        // DEBOUNCE RESIZE:
        // Instead of resizing constantly during the animation (which causes lag),
        // we wait until the sidebar animation has likely finished (150ms stable).
        // This makes the UI silky smooth, with a single "snap" resize at the end.
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        let lastWidth = chartContainer.clientWidth;
        let lastHeight = chartContainer.clientHeight;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;

            if (Math.abs(width - lastWidth) < 2 && Math.abs(height - lastHeight) < 2) return;
            lastWidth = width;
            lastHeight = height;

            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                chart?.resize();
            }, 150);
        });
        resizeObserver.observe(chartContainer);

        return () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeObserver.disconnect();
            chart?.dispose();
        };
    });

    onDestroy(() => {
        chart?.dispose();
    });

    $effect(() => {
        // Track all reactive dependencies that should trigger chart updates
        data;
        logScale;
        visibleSeries;
        colorContext;

        if (isChartReady) {
            updateChart();
        }
    });
</script>

<div class="chart-container" bind:this={chartContainer}></div>

<style>
    .chart-container {
        width: 100%;
        height: 400px;
        border-radius: 12px;
        background: rgba(30, 30, 46, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
</style>
