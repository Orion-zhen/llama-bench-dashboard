import {
    type BenchmarkResult,
    type FilterConfig,
    extractUniqueValues,
    filterData,
    getPPData,
    getTGData,
    extractSeriesInfo,
    type SeriesInfo
} from "$lib/utils/data";
import { buildColorContext, type ColorContext } from "$lib/utils/colorUtils";

export class DashboardState {
    // Core Data
    allData = $state<BenchmarkResult[]>([]);

    // Settings
    logScale = $state(true);

    // Filter State
    selectedGpus = $state<string[]>([]);
    selectedModels = $state<string[]>([]);
    selectedBatch = $state<number | null>(null);
    selectedUbatch = $state<number | null>(null);
    selectedBackends = $state<string[]>([]);
    selectedKvTypes = $state<string[]>([]);
    selectedDepths = $state<number[]>([]);
    selectedVersions = $state<string[]>([]);

    // Visibility State
    visibleSeriesSet = $state<Set<string>>(new Set());

    // Derived: Unique Values from All Data
    uniqueValues = $derived(extractUniqueValues(this.allData));

    // Derived: Filter Config
    filterConfig = $derived<FilterConfig>({
        gpu_info: this.selectedGpus,
        model_types: this.selectedModels,
        n_batch: this.selectedBatch,
        n_ubatch: this.selectedUbatch,
        backends: this.selectedBackends,
        kv_types: this.selectedKvTypes,
        n_depths: this.selectedDepths,
        versions: this.selectedVersions,
    });

    // Derived: Filtered Data
    filteredData = $derived(filterData(this.allData, this.filterConfig));

    // Derived: Split Data
    ppData = $derived(getPPData(this.filteredData));
    tgData = $derived(getTGData(this.filteredData));

    // Derived: Color Context
    colorContext = $derived<ColorContext>(buildColorContext(this.filteredData, {
        selectedModels: this.selectedModels,
        selectedGpus: this.selectedGpus,
        selectedBackends: this.selectedBackends,
        selectedDepths: this.selectedDepths,
        selectedKvTypes: this.selectedKvTypes
    }));

    // Derived: Series Info for Legend
    seriesInfos = $derived(extractSeriesInfo([...this.ppData, ...this.tgData], this.colorContext));

    constructor() {
        // No side-effects in global constructor
    }

    // Explicitly update visible series based on current data
    updateVisibleSeries() {
        const allKeys = this.seriesInfos.map((s) => s.key);
        if (this.visibleSeriesSet.size === 0 && allKeys.length > 0) {
            this.visibleSeriesSet = new Set(allKeys);
        }
    }

    // Actions
    setData(data: BenchmarkResult[]) {
        this.allData = data;
        this.initializeFilters();
    }

    initializeFilters() {
        // Auto-select all options for multi-selects if empty
        if (this.selectedModels.length === 0 && this.uniqueValues.models.length > 0) {
            this.selectedModels = [...this.uniqueValues.models];
        }
        if (this.selectedGpus.length === 0 && this.uniqueValues.gpus.length > 0) {
            this.selectedGpus = [...this.uniqueValues.gpus];
        }
        if (this.selectedBackends.length === 0 && this.uniqueValues.backends.length > 0) {
            this.selectedBackends = [...this.uniqueValues.backends];
        }
        if (this.selectedKvTypes.length === 0 && this.uniqueValues.kvTypes.length > 0) {
            this.selectedKvTypes = [...this.uniqueValues.kvTypes];
        }
        if (this.selectedDepths.length === 0 && this.uniqueValues.depths.length > 0) {
            this.selectedDepths = [...this.uniqueValues.depths];
        }
        if (this.selectedVersions.length === 0 && this.uniqueValues.versions.length > 0) {
            this.selectedVersions = [...this.uniqueValues.versions];
        }
    }

    resetFilters() {
        this.selectedGpus = [...this.uniqueValues.gpus];
        this.selectedBatch = null;
        this.selectedUbatch = null;
        // Reset multi-selects to ALL
        this.selectedModels = [...this.uniqueValues.models];
        this.selectedBackends = [...this.uniqueValues.backends];
        this.selectedKvTypes = [...this.uniqueValues.kvTypes];
        this.selectedDepths = [...this.uniqueValues.depths];
        this.selectedVersions = [...this.uniqueValues.versions];
    }

    toggleSeries(key: string) {
        const newSet = new Set(this.visibleSeriesSet);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        this.visibleSeriesSet = newSet;
    }

    // Helper for multi-select toggles
    toggleFilterItem<T>(currentList: T[], item: T): T[] {
        if (currentList.includes(item)) {
            return currentList.filter(i => i !== item);
        }
        return [...currentList, item];
    }
}

// Global instance for simplicity in this specific app structure
export const dashboard = new DashboardState();
