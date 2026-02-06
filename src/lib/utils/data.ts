// Benchmark data types
import { getHierarchicalColor, type ColorContext } from './colorUtils';

export interface BenchmarkResult {
    build_commit: string;
    build_number: number;
    cpu_info: string;
    gpu_info: string;
    backends: string;
    model_filename: string;
    model_type: string;
    model_size: number;
    model_n_params: number;
    n_batch: number;
    n_ubatch: number;
    n_threads: number;
    type_k: string;
    type_v: string;
    n_gpu_layers: number;
    flash_attn: boolean;
    n_prompt: number;
    n_gen: number;
    n_depth: number;
    test_time: string;
    avg_ns: number;
    stddev_ns: number;
    avg_ts: number;
    stddev_ts: number;
    samples_ns: number[];
    samples_ts: number[];
    main_gpu?: number;
}

// Filter configuration
export interface FilterConfig {
    // Fixed filters (single select)
    gpu_info: string[]; // Changed to multi-select
    n_batch: number | null;
    n_ubatch: number | null;
    // Comparison filters (multi select)
    model_types: string[]; // Changed to multi-select
    backends: string[];
    kv_types: string[]; // combined type_k/type_v
    n_depths: number[];
    versions: string[];
}

// Model info for cards
export interface ModelInfo {
    model_type: string;
    model_n_params: number;
    model_size: number;
}

// Format params as billions (e.g., "7.2B")
export function formatParamsB(params: number): string {
    return (params / 1e9).toFixed(1) + 'B';
}

// Format size as GiB (e.g., "4.52 GiB")
export function formatSizeGiB(bytes: number): string {
    return (bytes / (1024 ** 3)).toFixed(2) + ' GiB';
}

// Extract unique values from data
export function extractUniqueValues(data: BenchmarkResult[]) {
    const gpus = [...new Set(data.map(d => d.gpu_info))];
    const models = [...new Set(data.map(d => d.model_type))];
    const backends = [...new Set(data.map(d => d.backends))];
    const batches = [...new Set(data.map(d => d.n_batch))].sort((a, b) => a - b);
    const ubatches = [...new Set(data.map(d => d.n_ubatch))].sort((a, b) => a - b);
    const kvTypes = [...new Set(data.map(d => `${d.type_k}/${d.type_v}`))];
    const depths = [...new Set(data.map(d => d.n_depth))].sort((a, b) => a - b);
    const prompts = [...new Set(data.filter(d => d.n_prompt > 0).map(d => d.n_prompt))].sort((a, b) => a - b);
    const gens = [...new Set(data.filter(d => d.n_gen > 0).map(d => d.n_gen))].sort((a, b) => a - b);
    const versions = [...new Set(data.map(d => `${d.build_number} (${d.build_commit})`))].sort((a, b) => {
        const numA = parseInt(a.split(' ')[0]);
        const numB = parseInt(b.split(' ')[0]);
        return numB - numA; // Descending order
    });

    // Extract unique model infos
    const modelInfoMap = new Map<string, ModelInfo>();
    for (const d of data) {
        if (!modelInfoMap.has(d.model_type)) {
            modelInfoMap.set(d.model_type, {
                model_type: d.model_type,
                model_n_params: d.model_n_params,
                model_size: d.model_size
            });
        }
    }
    const modelInfos = [...modelInfoMap.values()];

    return { gpus, models, backends, batches, ubatches, kvTypes, depths, prompts, gens, modelInfos, versions };
}

// Filter data based on config
export function filterData(data: BenchmarkResult[], config: FilterConfig): BenchmarkResult[] {
    return data.filter(d => {
        // Fixed filters
        // Fixed filters
        if (config.gpu_info.length > 0 && !config.gpu_info.includes(d.gpu_info)) return false;
        if (config.model_types.length > 0 && !config.model_types.includes(d.model_type)) return false;
        if (config.n_batch && d.n_batch !== config.n_batch) return false;
        if (config.n_ubatch && d.n_ubatch !== config.n_ubatch) return false;

        // Comparison filters (if any selected, must match one)
        if (config.backends.length > 0 && !config.backends.includes(d.backends)) return false;
        if (config.kv_types.length > 0 && !config.kv_types.includes(`${d.type_k}/${d.type_v}`)) return false;
        if (config.n_depths.length > 0 && !config.n_depths.includes(d.n_depth)) return false;
        if (config.versions.length > 0 && !config.versions.includes(`${d.build_number} (${d.build_commit})`)) return false;

        return true;
    });
}

// Get PP (prompt processing) data
export function getPPData(data: BenchmarkResult[]): BenchmarkResult[] {
    return data.filter(d => d.n_prompt > 0 && d.n_gen === 0);
}

// Get TG (text generation) data
export function getTGData(data: BenchmarkResult[]): BenchmarkResult[] {
    return data.filter(d => d.n_gen > 0 && d.n_prompt === 0);
}

// Generate series key for grouping
export function getSeriesKey(d: BenchmarkResult): string {
    return `${d.gpu_info} | ${d.backends} | ${d.type_k}/${d.type_v} | depth=${d.n_depth}`;
}

// Group data by series key
export function groupBySeries(data: BenchmarkResult[]): Map<string, BenchmarkResult[]> {
    const groups = new Map<string, BenchmarkResult[]>();
    for (const d of data) {
        const key = getSeriesKey(d);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(d);
    }
    return groups;
}

// Series info for legend display
export interface SeriesInfo {
    key: string;           // series name/key
    backend: string;
    type_k: string;
    type_v: string;
    n_depth: number;
    n_batch: number;
    n_ubatch: number;
    model_type: string;
    gpu_info: string;
    color: string;
    version: string;
}

// Extract detailed series info from grouped data with hierarchical coloring
export function extractSeriesInfo(
    data: BenchmarkResult[],
    colorContext?: import('./colorUtils').ColorContext
): SeriesInfo[] {
    const groups = groupBySeries(data);
    const result: SeriesInfo[] = [];

    // Build color context if not provided
    const context = colorContext ?? buildDefaultColorContext(data);

    for (const [key, items] of groups) {
        const sample = items[0];

        // Generate hierarchical color
        const colorKey = {
            model: sample.model_type,
            gpu: sample.gpu_info,
            backend: sample.backends,
            depth: sample.n_depth,
            kvType: `${sample.type_k}/${sample.type_v}`,
        };


        result.push({
            key,
            backend: sample.backends,
            type_k: sample.type_k,
            type_v: sample.type_v,
            n_depth: sample.n_depth,
            n_batch: sample.n_batch,
            n_ubatch: sample.n_ubatch,
            model_type: sample.model_type,
            gpu_info: sample.gpu_info,
            color: getHierarchicalColor(colorKey, context),
            version: [...new Set(items.map(d => `${d.build_number} (${d.build_commit})`))].join(', '),
        });
    }

    return result;
}

// Build default color context from data (used when context not provided)
function buildDefaultColorContext(data: BenchmarkResult[]): import('./colorUtils').ColorContext {
    const primarySet = new Set<string>();
    const depthSet = new Set<number>();
    const kvTypeSet = new Set<string>();
    const modelSet = new Set<string>();
    const gpuSet = new Set<string>();
    const backendSet = new Set<string>();

    for (const item of data) {
        primarySet.add(`${item.model_type}|${item.gpu_info}|${item.backends}`);
        depthSet.add(item.n_depth);
        kvTypeSet.add(`${item.type_k}/${item.type_v}`);
        modelSet.add(item.model_type);
        gpuSet.add(item.gpu_info);
        backendSet.add(item.backends);
    }

    return {
        uniquePrimaries: [...primarySet].sort(),
        uniqueDepths: [...depthSet].sort((a, b) => a - b),
        uniqueKvTypes: [...kvTypeSet].sort(),
        isModelFixed: modelSet.size === 1,
        isGpuFixed: gpuSet.size === 1,
        isBackendFixed: backendSet.size === 1,
        isDepthFixed: depthSet.size === 1,
    };
}
