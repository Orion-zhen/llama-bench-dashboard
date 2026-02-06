<script lang="ts">
    import { dashboard } from "$lib/state/dashboard.svelte";
    import { formatParamsB, formatSizeGiB } from "$lib/utils/data";
    import FilterSection from "./ui/FilterSection.svelte";

    let isCollapsed = $state(false);

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
    }
</script>

<aside class="filter-panel" class:collapsed={isCollapsed}>
    <button
        class="toggle-btn"
        onclick={toggleCollapse}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class:rotate-180={!isCollapsed}
            style="transition: transform 0.3s ease"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    </button>

    <div class="clip-container">
        <div class="panel-content">
            <div class="panel-header">
                <h2>Configuration</h2>
                <button class="reset-btn" onclick={() => dashboard.resetFilters()}> Reset </button>
            </div>

            <!-- PRIMARY: GPU, Model, Backend -->
            <div class="section primary">
                <FilterSection
                    title="GPU"
                    options={dashboard.uniqueValues.gpus}
                    selected={dashboard.uniqueValues.gpus.filter((g) => dashboard.selectedGpus.includes(g))}
                    onSelect={(g) => {
                        dashboard.selectedGpus = dashboard.toggleFilterItem(dashboard.selectedGpus, g);
                    }}
                >
                    {#snippet actions()}
                        <button
                            class="text-btn"
                            onclick={() => (dashboard.selectedGpus = [...dashboard.uniqueValues.gpus])}>All</button
                        >
                        <span class="divider">/</span>
                        <button class="text-btn" onclick={() => (dashboard.selectedGpus = [])}>None</button>
                    {/snippet}
                </FilterSection>

                <FilterSection
                    title="Models"
                    options={dashboard.uniqueValues.modelInfos}
                    selected={dashboard.uniqueValues.modelInfos.filter((m) =>
                        dashboard.selectedModels.includes(m.model_type),
                    )}
                    onSelect={(m) => {
                        dashboard.selectedModels = dashboard.toggleFilterItem(dashboard.selectedModels, m.model_type);
                    }}
                >
                    {#snippet actions()}
                        <button
                            class="text-btn"
                            onclick={() => (dashboard.selectedModels = dashboard.uniqueValues.models)}>All</button
                        >
                        <span class="divider">/</span>
                        <button class="text-btn" onclick={() => (dashboard.selectedModels = [])}>None</button>
                    {/snippet}

                    {#snippet children(model)}
                        <div class="model-row">
                            <span class="model-name">{model.model_type}</span>
                            <div class="model-meta">
                                <span>{formatParamsB(model.model_n_params)}</span>
                                <span class="dot">•</span>
                                <span>{formatSizeGiB(model.model_size)}</span>
                            </div>
                        </div>
                    {/snippet}
                </FilterSection>

                <FilterSection
                    title="Backend"
                    options={dashboard.uniqueValues.backends}
                    selected={dashboard.selectedBackends}
                    onSelect={(b) =>
                        (dashboard.selectedBackends = dashboard.toggleFilterItem(dashboard.selectedBackends, b))}
                />
            </div>

            <div class="separator"></div>

            <!-- SECONDARY: Context Depth -->
            <div class="section secondary">
                <FilterSection
                    title="Context depth"
                    options={dashboard.uniqueValues.depths}
                    selected={dashboard.selectedDepths}
                    onSelect={(d) =>
                        (dashboard.selectedDepths = dashboard.toggleFilterItem(dashboard.selectedDepths, d))}
                />
            </div>

            <div class="separator"></div>

            <!-- TERTIARY: KV Cache, Batch Size -->
            <div class="section tertiary">
                <FilterSection
                    title="KV Cache"
                    options={dashboard.uniqueValues.kvTypes}
                    selected={dashboard.selectedKvTypes}
                    onSelect={(k) =>
                        (dashboard.selectedKvTypes = dashboard.toggleFilterItem(dashboard.selectedKvTypes, k))}
                />

                <div class="grid-2col">
                    <div class="section-item">
                        <span class="label">Batch</span>
                        <select class="form-select" bind:value={dashboard.selectedBatch}>
                            <option value={null}>All</option>
                            {#each dashboard.uniqueValues.batches as batch}
                                <option value={batch}>{batch}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="section-item">
                        <span class="label">UBatch</span>
                        <select class="form-select" bind:value={dashboard.selectedUbatch}>
                            <option value={null}>All</option>
                            {#each dashboard.uniqueValues.ubatches as ubatch}
                                <option value={ubatch}>{ubatch}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>

            <div class="separator"></div>

            <!-- QUATERNARY: Version & Display -->
            <div class="section quaternary">
                <span class="label">Advanced</span>
                <div class="section-item">
                    <div class="toggle-row">
                        <span class="toggle-label-text">Log scale</span>
                        <label class="switch">
                            <input type="checkbox" bind:checked={dashboard.logScale} />
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <FilterSection
                    title="Version"
                    options={dashboard.uniqueValues.versions}
                    selected={dashboard.selectedVersions}
                    onSelect={(v) =>
                        (dashboard.selectedVersions = dashboard.toggleFilterItem(dashboard.selectedVersions, v))}
                >
                    {#snippet children(v)}
                        <span class="version-chip-text">{v}</span>
                    {/snippet}
                </FilterSection>
            </div>
        </div>
    </div>
</aside>

<style>
    /* Specific styles for model chip content */
    .model-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        text-align: left;
    }

    .version-chip-text {
        font-size: 0.75rem;
    }

    .model-name {
        font-weight: 600;
        font-size: 0.85rem;
    }

    .model-meta {
        font-size: 0.7rem;
        opacity: 0.7;
        font-weight: 400;
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .dot {
        opacity: 0.5;
    }

    /* Layout & Container Styles - preserved from original */
    .filter-panel {
        width: 280px;
        flex-shrink: 0;
        background: rgba(24, 24, 37, 0.75);
        border-right: 1px solid rgba(255, 255, 255, 0.06);
        height: 100vh;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: width;
        position: relative;
        display: flex;
        flex-direction: column;
        z-index: 50;
        box-shadow:
            4px 0 24px rgba(0, 0, 0, 0.15),
            inset -1px 0 0 rgba(255, 255, 255, 0.03);
    }

    .filter-panel.collapsed {
        width: 0;
        border-right: none;
    }

    .clip-container {
        flex: 1;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px;
        width: 280px;
        min-width: 280px;
        opacity: 1;
        transform: translateX(0);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        scrollbar-width: thin;
    }

    .filter-panel.collapsed .panel-content {
        transform: translateX(-100%);
        pointer-events: none;
    }

    .toggle-btn {
        position: absolute;
        top: 24px;
        right: -24px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1e1e2e;
        border: 1px solid rgba(69, 71, 90, 0.3);
        border-left: none;
        border-radius: 0 6px 6px 0;
        color: #a6adc8;
        cursor: pointer;
        z-index: 60;
        transition: all 0.2s ease;
    }

    .toggle-btn:hover {
        color: #89b4fa;
        background: #252538;
    }
    .rotate-180 {
        transform: rotate(180deg);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    h2 {
        margin: 0;
        font-size: 0.95rem;
        color: #cdd6f4;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    .reset-btn {
        font-size: 0.75rem;
        color: #fab387;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    .reset-btn:hover {
        background: rgba(250, 179, 135, 0.1);
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .section-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .label {
        font-size: 0.75rem;
        color: #9399b2;
        font-weight: 500;
        letter-spacing: 0.5px;
    }

    .text-btn {
        background: none;
        border: none;
        color: #74c7ec;
        font-size: 0.7rem;
        cursor: pointer;
        padding: 0;
        opacity: 0.8;
    }
    .text-btn:hover {
        opacity: 1;
        text-decoration: underline;
    }
    .divider {
        color: #585b70;
        font-size: 0.7rem;
    }
    .separator {
        height: 1px;
        background: rgba(69, 71, 90, 0.2);
        margin: 20px 0;
    }
    .grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .toggle-label-text {
        font-size: 0.8rem;
        color: #a6adc8;
    }

    /* Toggle Switch */
    .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #313244;
        transition: 0.4s;
        border-radius: 24px;
        border: 1px solid #585b70;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: #a6adc8;
        transition: 0.4s;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: #89b4fa;
        border-color: #89b4fa;
    }
    input:checked + .slider:before {
        transform: translateX(20px);
        background-color: #1e1e2e;
    }

    /* Form Select */
    .form-select {
        width: 100%;
        background: rgba(30, 30, 46, 0.5);
        border: 1px solid rgba(69, 71, 90, 0.3);
        color: #cdd6f4;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        outline: none;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a6adc8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 12px top 50%;
        background-size: 10px auto;
    }
    .form-select:hover {
        border-color: #89b4fa;
    }
    .form-select:focus {
        border-color: #89b4fa;
        box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
    }

    /* Mobile - preserved */
    @media (max-width: 768px) {
        .filter-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 260px;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
        }
        .filter-panel.collapsed {
            transform: translateX(-100%);
            width: 260px;
        }
        .toggle-btn {
            right: -32px;
            width: 32px;
            height: 32px;
        }
    }
</style>
