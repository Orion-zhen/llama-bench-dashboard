/**
 * Hierarchical Color System for Benchmark Charts
 * 
 * Dynamically generates colors based on data hierarchy:
 * - Level 1 (Primary): Model + GPU + Backend → Different hues (golden angle distribution)
 * - Level 2: Context Depth → Lightness variation
 * - Level 3: KVCache Type → Saturation variation
 * 
 * When upper levels are fixed, lower levels get more color contrast.
 */

// ============================================================================
// Types
// ============================================================================

export interface ColorContext {
    // Unique primary combinations in current filtered data
    uniquePrimaries: string[];
    uniqueDepths: number[];
    uniqueKvTypes: string[];
    // Filter state - determines which level gets high contrast
    isModelFixed: boolean;
    isGpuFixed: boolean;
    isBackendFixed: boolean;
    isDepthFixed: boolean;
}

export interface SeriesColorKey {
    model: string;
    gpu: string;
    backend: string;
    depth: number;
    kvType: string;
}

// ============================================================================
// Core Color Generation
// ============================================================================

/**
 * Golden angle in degrees - ensures maximum separation between consecutive allocations
 * This is mathematically optimal for distributing points on a circle
 */
const GOLDEN_ANGLE = 137.5077640500378;

/**
 * Stable hash function - same input always produces same output
 */
function stableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Convert HSL to hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
    // Normalize h to 0-360, s and l to 0-100
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));

    const sNorm = s / 100;
    const lNorm = l / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get primary key from series color key (model + gpu + backend)
 */
export function getPrimaryKey(key: SeriesColorKey): string {
    return `${key.model}|${key.gpu}|${key.backend}`;
}

/**
 * Check if primary categories are fixed (only one unique value each)
 */
export function isPrimaryFixed(context: ColorContext): boolean {
    return context.isModelFixed && context.isGpuFixed && context.isBackendFixed;
}

// ============================================================================
// Hierarchical Color Assignment
// ============================================================================

/**
 * Main function: Generate hierarchical color based on series key and context
 * 
 * Strategy:
 * - If multiple primaries exist: Use hue to distinguish primaries, minimal depth/kv variation
 * - If primary is fixed: Use hue to distinguish depths
 * - If primary and depth are fixed: Use hue to distinguish kv types
 */
export function getHierarchicalColor(
    key: SeriesColorKey,
    context: ColorContext
): string {
    const primaryKey = getPrimaryKey(key);
    const primaryFixed = isPrimaryFixed(context);
    const depthFixed = context.isDepthFixed;

    // Base color parameters
    let hue: number;
    let saturation: number;
    let lightness: number;

    if (!primaryFixed) {
        // === Multiple primary categories: Primary gets distinct hues ===
        const primaryIndex = context.uniquePrimaries.indexOf(primaryKey);
        const primaryCount = context.uniquePrimaries.length;

        // Use golden angle for maximum separation
        hue = (primaryIndex * GOLDEN_ANGLE) % 360;

        // Base saturation and lightness for dark theme readability
        saturation = 65;
        lightness = 58;

        // Minor depth variation (±8% lightness)
        const depthIndex = context.uniqueDepths.indexOf(key.depth);
        const depthCount = context.uniqueDepths.length;
        if (depthCount > 1 && depthIndex >= 0) {
            const depthOffset = ((depthIndex / (depthCount - 1)) - 0.5) * 16;
            lightness += depthOffset;
        }

        // Minor kv variation (±5% saturation)
        const kvIndex = context.uniqueKvTypes.indexOf(key.kvType);
        const kvCount = context.uniqueKvTypes.length;
        if (kvCount > 1 && kvIndex >= 0) {
            const kvOffset = ((kvIndex / (kvCount - 1)) - 0.5) * 10;
            saturation += kvOffset;
        }

    } else if (!depthFixed) {
        // === Primary fixed, multiple depths: Depth gets distinct hues ===
        const primaryHash = stableHash(primaryKey);
        const baseHue = (primaryHash * GOLDEN_ANGLE) % 360;

        const depthIndex = context.uniqueDepths.indexOf(key.depth);
        const depthCount = context.uniqueDepths.length;

        // Spread depths across 120° range centered on base hue
        const hueRange = Math.min(120, depthCount * 25);
        if (depthCount > 1 && depthIndex >= 0) {
            hue = baseHue + ((depthIndex / (depthCount - 1)) - 0.5) * hueRange;
        } else {
            hue = baseHue;
        }

        saturation = 70;
        lightness = 55;

        // Minor kv variation
        const kvIndex = context.uniqueKvTypes.indexOf(key.kvType);
        const kvCount = context.uniqueKvTypes.length;
        if (kvCount > 1 && kvIndex >= 0) {
            const kvOffset = ((kvIndex / (kvCount - 1)) - 0.5) * 12;
            lightness += kvOffset;
        }

    } else {
        // === Primary and depth fixed: KV types get distinct hues ===
        const fullKey = `${primaryKey}|${key.depth}`;
        const baseHash = stableHash(fullKey);
        const baseHue = (baseHash * GOLDEN_ANGLE) % 360;

        const kvIndex = context.uniqueKvTypes.indexOf(key.kvType);
        const kvCount = context.uniqueKvTypes.length;

        // Spread kv types across 90° range
        const hueRange = Math.min(90, kvCount * 30);
        if (kvCount > 1 && kvIndex >= 0) {
            hue = baseHue + ((kvIndex / (kvCount - 1)) - 0.5) * hueRange;
        } else {
            hue = baseHue;
        }

        saturation = 75;
        lightness = 55;
    }

    // Clamp values for dark theme visibility
    lightness = Math.max(45, Math.min(70, lightness));
    saturation = Math.max(50, Math.min(85, saturation));

    return hslToHex(hue, saturation, lightness);
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Build color context from current data and filter state
 */
export function buildColorContext(
    data: Array<{ model_type: string; gpu_info: string; backends: string; n_depth: number; type_k: string; type_v: string }>,
    filterState: {
        selectedModels: string[];
        selectedGpus: string[];
        selectedBackends: string[];
        selectedDepths: number[];
        selectedKvTypes: string[];
    }
): ColorContext {
    // Extract unique combinations from current data
    const primarySet = new Set<string>();
    const depthSet = new Set<number>();
    const kvTypeSet = new Set<string>();

    for (const item of data) {
        primarySet.add(`${item.model_type}|${item.gpu_info}|${item.backends}`);
        depthSet.add(item.n_depth);
        kvTypeSet.add(`${item.type_k}/${item.type_v}`);
    }

    const uniquePrimaries = [...primarySet].sort();
    const uniqueDepths = [...depthSet].sort((a, b) => a - b);
    const uniqueKvTypes = [...kvTypeSet].sort();

    // Determine if categories are fixed
    const uniqueModels = new Set(data.map(d => d.model_type));
    const uniqueGpus = new Set(data.map(d => d.gpu_info));
    const uniqueBackends = new Set(data.map(d => d.backends));

    return {
        uniquePrimaries,
        uniqueDepths,
        uniqueKvTypes,
        isModelFixed: uniqueModels.size === 1,
        isGpuFixed: uniqueGpus.size === 1,
        isBackendFixed: uniqueBackends.size === 1,
        isDepthFixed: uniqueDepths.length === 1,
    };
}
