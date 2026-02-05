<script lang="ts">
    import { dashboard } from "$lib/state/dashboard.svelte";
    import type { SeriesInfo } from "$lib/utils/data";
    import { fly, fade, scale, crossfade } from "svelte/transition";
    import { cubicOut, backOut, quintOut } from "svelte/easing";
    import { flip } from "svelte/animate";
    import { onMount } from "svelte";

    // Create crossfade for coordinated enter/leave animations
    const [send, receive] = crossfade({
        duration: 300,
        easing: cubicOut,
        fallback(node) {
            return scale(node, { start: 0.9, duration: 250, easing: cubicOut });
        },
    });

    // Animation constants
    const STAGGER_DELAY = 40;
    const CARD_DURATION = 350;
    const GROUP_DURATION = 300;

    // Group series by primary category (model + gpu + backend)
    function getPrimaryKey(info: SeriesInfo): string {
        return `${info.model_type}|${info.gpu_info}|${info.backend}`;
    }

    interface GroupedSeries {
        primaryKey: string;
        model_type: string;
        gpu_info: string;
        backend: string;
        items: SeriesInfo[];
    }

    let groupedSeries = $derived(() => {
        const groups = new Map<string, GroupedSeries>();

        for (const info of dashboard.seriesInfos) {
            const key = getPrimaryKey(info);
            if (!groups.has(key)) {
                groups.set(key, {
                    primaryKey: key,
                    model_type: info.model_type,
                    gpu_info: info.gpu_info,
                    backend: info.backend,
                    items: [],
                });
            }
            groups.get(key)!.items.push(info);
        }

        // Sort items within each group by depth then kv type
        for (const group of groups.values()) {
            group.items.sort((a, b) => {
                if (a.n_depth !== b.n_depth) return a.n_depth - b.n_depth;
                const kvA = `${a.type_k}/${a.type_v}`;
                const kvB = `${b.type_k}/${b.type_v}`;
                return kvA.localeCompare(kvB);
            });
        }

        return [...groups.values()];
    });

    // Calculate stagger delay for items
    function getItemDelay(groupIndex: number, itemIndex: number): number {
        return groupIndex * 80 + itemIndex * STAGGER_DELAY;
    }

    // Auto-height animation
    let legendGroupsRef: HTMLDivElement;
    let wrapperHeight = $state<number | null>(null);
    let isFirstRender = true;

    onMount(() => {
        if (!legendGroupsRef) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newHeight = entry.contentRect.height;
                if (isFirstRender) {
                    // No animation on first render
                    wrapperHeight = newHeight;
                    isFirstRender = false;
                } else if (wrapperHeight !== newHeight) {
                    wrapperHeight = newHeight;
                }
            }
        });

        resizeObserver.observe(legendGroupsRef);

        return () => {
            resizeObserver.disconnect();
        };
    });
</script>

<div class="legend-container">
    <div class="legend-header">
        <span class="legend-icon"
            ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                ><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                /><rect x="14" y="14" width="7" height="7" /></svg
            ></span
        >
        <span class="legend-title">Legend</span>
        <span class="legend-count">{dashboard.visibleSeriesSet.size} / {dashboard.seriesInfos.length} On Display</span>
    </div>

    <!-- Height-animated wrapper -->
    <div class="legend-groups-wrapper" style={wrapperHeight !== null ? `height: ${wrapperHeight}px;` : ""}>
        <div class="legend-groups" bind:this={legendGroupsRef}>
            {#each groupedSeries() as group, groupIndex (group.primaryKey)}
                <div
                    class="legend-group"
                    in:fly={{ y: 20, duration: GROUP_DURATION, delay: groupIndex * 60, easing: cubicOut }}
                    out:fade={{ duration: 200 }}
                    animate:flip={{ duration: 400, easing: quintOut }}
                >
                    <div class="group-header">
                        <span class="gpu-badge">{group.gpu_info}</span>
                        <span class="model-badge">{group.model_type}</span>
                        <span class="backend-badge">{group.backend}</span>
                    </div>
                    <div class="group-items">
                        {#each group.items as info, itemIndex (info.key)}
                            <button
                                class="legend-item"
                                class:hidden={!dashboard.visibleSeriesSet.has(info.key)}
                                onclick={() => dashboard.toggleSeries(info.key)}
                                in:receive={{ key: info.key }}
                                out:send={{ key: info.key }}
                                animate:flip={{ duration: 400, easing: quintOut }}
                            >
                                <div
                                    class="legend-color"
                                    style="background-color: {info.color}; box-shadow: 0 0 8px {info.color}40;"
                                ></div>
                                <div class="legend-content">
                                    <div class="legend-main">
                                        <span class="kv-badge">{info.type_k}/{info.type_v}</span>
                                        <span class="depth-badge">d={info.n_depth}</span>
                                    </div>
                                    <div class="legend-details">
                                        <span class="detail-item">
                                            <span class="detail-label">batch</span>
                                            <span class="detail-value">{info.n_batch}/{info.n_ubatch}</span>
                                        </span>
                                        <span class="detail-item">
                                            <span class="detail-label">ver</span>
                                            <span class="detail-value">{info.version}</span>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    /* Styles preserved from original */
    .legend-container {
        background: rgba(30, 30, 46, 0.55);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 12px 16px;
        margin-bottom: 12px;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .legend-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(69, 71, 90, 0.5);
    }

    .legend-icon {
        font-size: 16px;
    }
    .legend-title {
        color: #cdd6f4;
        font-weight: 600;
        font-size: 14px;
    }
    .legend-count {
        margin-left: auto;
        color: #8b92a8;
        font-size: 12px;
    }

    .legend-groups-wrapper {
        overflow: hidden;
        transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .legend-groups {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .legend-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(30, 30, 46, 0.45);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(8px);
        will-change: transform;
    }

    .group-header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    }
    .group-items {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: rgba(45, 45, 65, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
        transform-origin: center;
        backdrop-filter: blur(6px);
        /* Only transition non-transform properties to avoid interfering with flip animation */
        transition:
            opacity 0.25s ease,
            background 0.25s ease,
            border-color 0.25s ease,
            filter 0.25s ease,
            box-shadow 0.25s ease;
        will-change: transform;
    }

    .legend-item:hover {
        background: rgba(60, 60, 85, 0.6);
        border-color: rgba(137, 180, 250, 0.4);
        transform: translateY(-2px);
    }
    .legend-item:active {
        transform: scale(0.97);
    }
    .legend-item.hidden {
        opacity: 0.35;
        filter: grayscale(50%);
    }

    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        flex-shrink: 0;
        box-shadow: 0 0 6px currentColor;
    }

    .legend-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .legend-main {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
    }
    .legend-details {
        display: flex;
        gap: 8px;
    }

    .backend-badge {
        background: rgba(137, 180, 250, 0.2);
        color: #89b4fa;
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
    }
    .kv-badge {
        background: rgba(166, 227, 161, 0.2);
        color: #a6e3a1;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    .depth-badge {
        background: rgba(203, 166, 247, 0.2);
        color: #cba6f7;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    .gpu-badge {
        color: #fab387;
        font-weight: 600;
        background: rgba(250, 179, 135, 0.15);
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 13px;
    }
    .model-badge {
        color: #f9e2af;
        font-weight: 600;
        background: rgba(249, 226, 175, 0.15);
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 13px;
    }

    .detail-item {
        display: flex;
        gap: 3px;
        font-size: 11px;
    }
    .detail-label {
        color: #6c7086;
    }
    .detail-value {
        color: #a6adc8;
        font-weight: 500;
    }
</style>
