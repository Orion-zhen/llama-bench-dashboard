<script lang="ts">
    interface Props {
        variant?: "card" | "text" | "chart";
        lines?: number;
    }

    let { variant = "card", lines = 3 }: Props = $props();
</script>

{#if variant === "card"}
    <div class="skeleton-card">
        <div class="skeleton-icon"></div>
        <div class="skeleton-content">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
        </div>
    </div>
{:else if variant === "chart"}
    <div class="skeleton-chart">
        <div class="skeleton-line short" style="width: 40%;"></div>
        <div class="skeleton-bars">
            {#each { length: 8 } as _, i}
                <div class="skeleton-bar" style="height: {30 + Math.random() * 50}%;"></div>
            {/each}
        </div>
    </div>
{:else}
    <div class="skeleton-text">
        {#each { length: lines } as _, i}
            <div class="skeleton-line" style="width: {70 + Math.random() * 30}%;"></div>
        {/each}
    </div>
{/if}

<style>
    .skeleton-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(30, 30, 46, 0.6);
        border: 1px solid rgba(69, 71, 90, 0.3);
        border-radius: 10px;
    }

    .skeleton-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: linear-gradient(90deg, #313244 25%, #45475a 50%, #313244 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    .skeleton-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, #313244 25%, #45475a 50%, #313244 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
    }

    .skeleton-line.short {
        width: 60%;
        height: 10px;
    }

    .skeleton-chart {
        height: 400px;
        padding: 24px;
        background: rgba(30, 30, 46, 0.6);
        border: 1px solid rgba(69, 71, 90, 0.3);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .skeleton-bars {
        flex: 1;
        display: flex;
        align-items: flex-end;
        gap: 12px;
        padding-top: 24px;
    }

    .skeleton-bar {
        flex: 1;
        background: linear-gradient(90deg, #313244 25%, #45475a 50%, #313244 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px 4px 0 0;
    }

    .skeleton-text {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    @keyframes shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
</style>
