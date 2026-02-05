import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';
import type { BenchmarkResult } from '$lib/utils/data';

async function getJsonFilesRecursively(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const res = join(dir, entry.name);
        if (entry.isDirectory()) {
            return getJsonFilesRecursively(res);
        } else {
            return entry.name.endsWith('.json') ? [res] : [];
        }
    }));
    return files.flat();
}

export const load: PageServerLoad = async () => {
    const resultsDir = join(process.cwd(), 'static', 'results');

    try {
        const jsonFiles = await getJsonFilesRecursively(resultsDir);

        const allResults: BenchmarkResult[] = [];

        for (const filePath of jsonFiles) {
            try {
                const content = await readFile(filePath, 'utf-8');
                const data = JSON.parse(content) as BenchmarkResult[];

                // Process gpu_info based on main_gpu index
                data.forEach(result => {
                    if (result.gpu_info && typeof result.main_gpu === 'number') {
                        const gpus = result.gpu_info.split(',').map(s => s.trim());
                        if (gpus.length > result.main_gpu) {
                            result.gpu_info = gpus[result.main_gpu];
                        }
                    }
                });

                allResults.push(...data);
            } catch (e) {
                console.warn(`Failed to load ${filePath}:`, e);
            }
        }

        return {
            benchmarkData: allResults,
            fileCount: jsonFiles.length
        };
    } catch (e) {
        console.error('Failed to read results directory:', e);
        return {
            benchmarkData: [] as BenchmarkResult[],
            fileCount: 0
        };
    }
};
