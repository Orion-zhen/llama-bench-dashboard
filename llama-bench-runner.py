#!/usr/bin/env python3
"""
Llama-Bench Automated Testing Script
=====================================
Runs comprehensive benchmarks with various parameter combinations
and provides real-time progress visualization.

Usage:
    python llama-bench-runner.py <model_path>
    
Example:
    python llama-bench-runner.py /path/to/model.gguf
"""

import subprocess
import sys
import os
import json
import signal
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List, Dict, Tuple
import time
import shutil

# Check only essential imports here, install rich if missing
try:
    import rich
except ImportError:
    print("Installing required dependency: rich")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rich", "-q"])

from rich.console import Console, Group
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.table import Table
from rich.live import Live
from rich import box

# =============================================
# Configuration
# =============================================

@dataclass
class BenchConfig:
    """Benchmark configuration parameters"""
    # KV Cache configurations (cannot use multi-value syntax)
    kv_cache_types: list = None
    
    # Parameters that support multi-value syntax
    batch_sizes: str = "8192"
    ubatch_sizes: str = "2048"
    depths: str = "0,512,1024,2048,4096,8192"
    prompt_lengths: str = "128,256,512,1024,2048,4096,8192"
    gen_lengths: str = "128,256,512,1024,2048,4096,8192"
    
    # Output settings
    output_dir: str = "test-results"
    
    def __post_init__(self):
        if self.kv_cache_types is None:
            self.kv_cache_types = [
                # ("f16", "f16"),
                ("q8_0", "q8_0"),
            ]

    def count_combinations(self) -> int:
        """Estimate total number of tests per KV cache config"""
        b = self._count_opts(self.batch_sizes)
        ub = self._count_opts(self.ubatch_sizes)
        d = self._count_opts(self.depths)
        p = self._count_opts(self.prompt_lengths)
        n = self._count_opts(self.gen_lengths)
        
        total = b * ub * d * p * n
        return total if total > 0 else 1

    @staticmethod
    def _count_opts(s: str) -> int:
        return len(s.split(',')) if s else 0


# =============================================
# Progress Visualization
# =============================================

class BenchmarkVisualizer:
    """Minimalist visualization for benchmark progress"""
    
    def __init__(self, total_runs_per_config: int, config: BenchConfig):
        self.console = Console()
        self.total_runs_per_config = total_runs_per_config
        self.config = config
        self.results_history = []
        self.start_time = time.time()
        
        # Main Progress Bar
        self.progress = Progress(
            SpinnerColumn(style="cyan"),
            TextColumn("[bold cyan]{task.description}"),
            BarColumn(bar_width=40, style="dim white", complete_style="cyan"),
            TextColumn("[dim]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
        )
        self.task_id = self.progress.add_task("Running Benchmarks...", total=total_runs_per_config)

    def generate_display(self) -> Table:
        """Generate the minimalist table display"""
        table = Table(box=box.SIMPLE, show_header=True, header_style="bold dim", padding=(0, 2), expand=True)
        table.add_column("KV Config", style="white")
        table.add_column("Batch", justify="right", style="dim")
        table.add_column("Params (P/G)", justify="center")
        table.add_column("Depth", justify="right", style="dim")
        table.add_column("Speed", justify="right")
        
        # Show last 10 results
        for res in self.results_history[-10:]:
            self._add_result_row(table, res)
            
        return table

    def _add_result_row(self, table: Table, res: dict):
        kv = res['kv']
        batch = str(res['batch'])
        io = f"{res['n_prompt']} / {res['n_gen']}"
        depth = str(res['n_depth'])
        
        enc_s = res['enc_speed']
        gen_s = res['gen_speed']
        
        speed_str = "-"
        if enc_s > 0:
            speed_str = f"[green]PP: {enc_s:,.1f} t/s[/green]"
        elif gen_s > 0:
            speed_str = f"[blue]TG: {gen_s:,.1f} t/s[/blue]"
        
        table.add_row(kv, batch, io, depth, speed_str)

    def update_result(self, result_json, kv_str):
        n_prompt = result_json.get("n_prompt", 0)
        n_gen = result_json.get("n_gen", 0)
        n_depth = result_json.get("n_depth", 0)
        
        enc_speed, gen_speed = self._calculate_speeds(result_json, n_prompt, n_gen)
        
        entry = {
            "kv": kv_str,
            "batch": result_json.get("n_batch", "?"),
            "n_prompt": n_prompt,
            "n_gen": n_gen,
            "n_depth": n_depth,
            "enc_speed": enc_speed,
            "gen_speed": gen_speed
        }
        self.results_history.append(entry)
        self.progress.advance(self.task_id)

    def _calculate_speeds(self, result_json: dict, n_prompt: int, n_gen: int) -> Tuple[float, float]:
        avg_ts = result_json.get("avg_ts", 0)
        
        if n_gen == 0:
            return float(avg_ts), 0.0
        
        if avg_ts > 0:
            return 0.0, float(avg_ts)
            
        # Fallback calculation
        t_enc = result_json.get("t_pp_ms", 0)
        t_gen = result_json.get("t_tg_ms", 0)
        
        enc_s = (n_prompt / (t_enc/1000.0)) if t_enc > 0 else 0.0
        gen_s = (n_gen / (t_gen/1000.0)) if t_gen > 0 else 0.0
        
        return enc_s, gen_s

    def log_error(self, msg):
        self.console.print(f"[red]Error: {msg}[/red]")


# =============================================
# Benchmark Runner
# =============================================

class LlamaBenchRunner:
    """Main benchmark runner class"""
    
    def __init__(self, model_path: str, config: Optional[BenchConfig] = None):
        self.model_path = Path(model_path)
        self.config = config or BenchConfig()
        self.console = Console()
        self.process = None
        
        if not self.model_path.exists():
            self.console.print(f"[red]Error: Model file not found: {self.model_path}[/red]")
            sys.exit(1)
        
        self.output_dir = Path(self.config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def build_command(self, cache_type_k: str, cache_type_v: str) -> list:
        return [
            "llama-bench",
            "-fa", "1",
            "-r", "3",
            "-m", str(self.model_path),
            "-ctk", cache_type_k,
            "-ctv", cache_type_v,
            "-b", self.config.batch_sizes,
            "-ub", self.config.ubatch_sizes,
            "-d", self.config.depths,
            "-p", self.config.prompt_lengths,
            "-n", self.config.gen_lengths,
            "-o", "jsonl",
        ]
    
    def get_output_filename(self, cache_type_k: str, cache_type_v: str) -> Path:
        date_str = datetime.now().strftime("%Y%m%d")
        return self.output_dir / f"raw-data-{cache_type_k}-{cache_type_v}-{date_str}.json"
    
    def run_all(self):
        """Run all benchmark configurations with visualization"""
        per_config_runs = self.config.count_combinations()
        total_runs = per_config_runs * len(self.config.kv_cache_types)
        
        visualizer = BenchmarkVisualizer(total_runs, self.config)
        
        try:
            with Live(Group(visualizer.progress, visualizer.generate_display()), 
                      refresh_per_second=10, 
                      console=self.console) as live_display:
                
                for k, v in self.config.kv_cache_types:
                    self._run_single_config(k, v, visualizer, live_display)

        except KeyboardInterrupt:
            self._handle_interrupt()
            
        self.print_summary(visualizer)

    def _run_single_config(self, k: str, v: str, visualizer: BenchmarkVisualizer, live: Live):
        kv_str = f"{k}/{v}"
        cmd = self.build_command(k, v)
        output_file = self.get_output_filename(k, v)
        collected_results = []

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Read stdout line by line until EOF
            for line in iter(self.process.stdout.readline, ''):
                result = self._parse_line(line)
                if not result:
                    continue
                
                collected_results.append(result)
                visualizer.update_result(result, kv_str)
                live.update(Group(visualizer.progress, visualizer.generate_display()))
            
            rc = self.process.wait()
            self._check_process_result(rc, collected_results, kv_str, visualizer)

        except Exception as e:
            visualizer.log_error(f"Error: {str(e)}")
            # In case of error during execution, we still want to save what we have
        finally:
            self._save_results(collected_results, output_file)
            self.process = None

    def _parse_line(self, line: str) -> Optional[dict]:
        line = line.strip()
        if not line:
            return None
        try:
            data = json.loads(line)
            if isinstance(data, dict) and "n_prompt" in data:
                return data
        except json.JSONDecodeError:
            pass
        return None

    def _check_process_result(self, rc: int, results: list, kv_str: str, visualizer: BenchmarkVisualizer):
        if rc != 0:
            # Try to read stderr if available
            err_msg = f"Process failed (rc={rc})"
            if self.process and self.process.stderr:
                err_out = self.process.stderr.read()
                if err_out:
                    err_msg += f"\nStderr: {err_out}"
            visualizer.log_error(err_msg)
        elif not results:
            visualizer.log_error(f"No results for {kv_str}")

    def _save_results(self, results: list, output_file: Path):
        if not results:
            return
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
        except IOError as e:
            print(f"Failed to save results to {output_file}: {e}")

    def _handle_interrupt(self):
        if self.process:
            self.process.terminate()
        self.console.print("\n[yellow]Interrupted.[/yellow]")
        sys.exit(130)

    def print_summary(self, visualizer: BenchmarkVisualizer):
        elapsed = time.time() - visualizer.start_time
        self.console.print()
        self.console.print(f"[bold green]Done.[/bold green] Time: {int(elapsed // 60)}m {int(elapsed % 60)}s")
        self.console.print(f"Results saved to: [dim]{self.output_dir}[/dim]")


def main():
    if len(sys.argv) < 2:
        print("Usage: python llama-bench-runner.py <model_path>")
        sys.exit(1)
        
    runner = LlamaBenchRunner(sys.argv[1])
    
    total_tests = len(runner.config.kv_cache_types) * runner.config.count_combinations()
    print(f"Plan to run approximately {total_tests} tests.")
    print("Press Enter to start...")
    try:
        input()
    except KeyboardInterrupt:
        sys.exit(0)
        
    runner.run_all()

if __name__ == "__main__":
    main()
