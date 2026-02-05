<script lang="ts">
    import GeometricIcon from "$lib/components/ui/GeometricIcon.svelte";
    import Chart from "$lib/components/Chart.svelte";
    import ChartLegend from "$lib/components/ChartLegend.svelte";
    import FilterPanel from "$lib/components/FilterPanel.svelte";
    import StatCard from "$lib/components/ui/StatCard.svelte";
    import { dashboard } from "$lib/state/dashboard.svelte";
    import type { BenchmarkResult } from "$lib/utils/data";

    let { data } = $props();

    // Initialize state (replaces $effect loop for initialization)
    $effect(() => {
        dashboard.setData(data.benchmarkData as BenchmarkResult[]);
    });

    // React to data changes to update visibility (Client-side only)
    $effect(() => {
        // Track seriesInfos changes
        dashboard.seriesInfos;
        dashboard.updateVisibleSeries();
    });
</script>

<div class="app-layout">
    <FilterPanel />

    <main class="main-content">
        <header class="header">
            <div class="header-title-row">
                <GeometricIcon size={56} class="header-icon" />
                <h1>llama.cpp Benchmark Dashboard</h1>
            </div>
            <p>Visualize inference performance across different configurations</p>
        </header>

        {#if dashboard.allData.length === 0}
            <div class="empty-state">
                <div class="empty-icon">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <path
                            d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z"
                        />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </div>
                <h3>No Benchmark Data Found</h3>
                <p>Add JSON files to <code>static/results/</code> to get started</p>
            </div>
        {:else}
            <div class="stats-row">
                <StatCard label="Total Tests" value={dashboard.allData.length}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <rect x="3" y="12" width="4" height="9" /><rect x="10" y="6" width="4" height="15" /><rect
                            x="17"
                            y="3"
                            width="4"
                            height="18"
                        />
                    </svg>
                </StatCard>
                <StatCard label="Filtered Results" value={dashboard.filteredData.length}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <circle cx="12" cy="12" r="8" /><line x1="12" y1="4" x2="12" y2="20" /><line
                            x1="4"
                            y1="12"
                            x2="20"
                            y2="12"
                        /><circle cx="12" cy="12" r="3" />
                    </svg>
                </StatCard>
                <StatCard label="Data Files" value={data.fileCount}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <rect x="4" y="4" width="12" height="12" /><rect x="8" y="8" width="12" height="12" />
                    </svg>
                </StatCard>
                <StatCard label="Backends" value={dashboard.uniqueValues.backends.length}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <polygon points="12,2 19.5,6.5 19.5,15.5 12,20 4.5,15.5 4.5,6.5" /><circle
                            cx="12"
                            cy="11"
                            r="4"
                        />
                    </svg>
                </StatCard>
            </div>

            <div class="charts-container">
                {#if dashboard.ppData.length > 0 || dashboard.tgData.length > 0}
                    <ChartLegend />
                {/if}

                {#if dashboard.ppData.length > 0}
                    <Chart
                        data={dashboard.ppData}
                        xField="n_prompt"
                        title="Prompt Processing Speed vs Prompt Length"
                        logScale={dashboard.logScale}
                        visibleSeries={dashboard.visibleSeriesSet}
                        colorContext={dashboard.colorContext}
                    />
                {:else}
                    <div class="empty-state">
                        <p>No prompt processing data matches the current filters</p>
                    </div>
                {/if}

                {#if dashboard.tgData.length > 0}
                    <Chart
                        data={dashboard.tgData}
                        xField="n_gen"
                        title="Text Generation Speed vs Generation Length"
                        logScale={dashboard.logScale}
                        visibleSeries={dashboard.visibleSeriesSet}
                        colorContext={dashboard.colorContext}
                    />
                {:else}
                    <div class="empty-state">
                        <p>No text generation data matches the current filters</p>
                    </div>
                {/if}
            </div>
        {/if}
    </main>
</div>
