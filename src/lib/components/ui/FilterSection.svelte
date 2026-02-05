<script lang="ts" generics="T">
    interface Props {
        title: string;
        options: T[];
        selected: T[];
        onSelect: (item: T) => void;
        getLabel?: (item: T) => string;
        children?: import("svelte").Snippet<[T]>; // For custom item rendering like Model cards
        actions?: import("svelte").Snippet; // For All/None buttons
    }

    let { title, options, selected, onSelect, getLabel = (i) => String(i), children, actions }: Props = $props();

    function isSelected(item: T) {
        return selected.includes(item);
    }
</script>

<div class="section-item">
    <div class="label-row">
        <span class="label">{title}</span>
        {#if actions}
            <div class="actions">
                {@render actions()}
            </div>
        {/if}
    </div>

    <div class="chip-grid">
        {#each options as option}
            <button class="chip" class:active={isSelected(option)} onclick={() => onSelect(option)}>
                {#if children}
                    {@render children(option)}
                {:else}
                    {getLabel(option)}
                {/if}
            </button>
        {/each}
    </div>
</div>

<style>
    .section-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .label {
        font-size: 0.75rem;
        color: #9399b2;
        font-weight: 500;
        letter-spacing: 0.5px;
    }

    .actions {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .chip {
        background: rgba(30, 30, 46, 0.5);
        border: 1px solid rgba(69, 71, 90, 0.3);
        color: #a6adc8;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .chip:hover {
        background: rgba(49, 50, 68, 0.8);
        border-color: #89b4fa;
        color: #cdd6f4;
    }

    .chip.active {
        background: rgba(137, 180, 250, 0.15);
        border-color: #89b4fa;
        color: #89b4fa;
        font-weight: 500;
    }
</style>
