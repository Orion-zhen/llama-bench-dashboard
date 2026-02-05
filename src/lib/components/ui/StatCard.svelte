<script lang="ts">
    interface Props {
        label: string;
        value: string | number;
        children?: import("svelte").Snippet; // Icon
    }

    let { label, value, children }: Props = $props();
</script>

<div class="stat-card">
    <div class="stat-icon">
        {#if children}
            {@render children()}
        {/if}
    </div>
    <div class="stat-info">
        <div class="label">{label}</div>
        <div class="value">{value}</div>
    </div>
</div>

<style>
    .stat-card {
        background: rgba(30, 30, 46, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition:
            transform 0.2s,
            border-color 0.2s;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        border-color: rgba(137, 180, 250, 0.3);
        background: rgba(30, 30, 46, 0.8);
    }

    .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(137, 180, 250, 0.1);
        color: #89b4fa;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .stat-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .label {
        font-size: 0.75rem;
        color: #a6adc8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
    }

    .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #cdd6f4;
        line-height: 1.2;
    }
</style>
