
import { groupBySeries, getSeriesKey, type BenchmarkResult } from './src/lib/utils/data';

// Mock data
const baseResult: BenchmarkResult = {
    build_commit: 'abc',
    build_number: 1,
    cpu_info: 'cpu',
    gpu_info: 'GPU A',
    backends: 'backend1',
    model_filename: 'model',
    model_type: 'llama',
    model_size: 1,
    model_n_params: 1,
    n_batch: 1,
    n_ubatch: 1,
    n_threads: 1,
    type_k: 'f16',
    type_v: 'f16',
    n_gpu_layers: 1,
    flash_attn: true,
    n_prompt: 1,
    n_gen: 1,
    n_depth: 1,
    test_time: 'now',
    avg_ns: 1,
    stddev_ns: 0,
    avg_ts: 1,
    stddev_ts: 0,
    samples_ns: [],
    samples_ts: []
};

const item1 = { ...baseResult, gpu_info: 'GPU A' };
const item2 = { ...baseResult, gpu_info: 'GPU B' };

const groups = groupBySeries([item1, item2]);

console.log(`Number of groups: ${groups.size}`);
if (groups.size === 1) {
    console.log('FAIL: Items with different GPUs were grouped together.');
} else {
    console.log('PASS: Items with different GPUs were separated.');
}

// Print keys for debugging
for (const key of groups.keys()) {
    console.log(`Group Key: ${key}`);
}
