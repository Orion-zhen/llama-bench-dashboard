<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { tweened } from "svelte/motion";
    import { cubicInOut } from "svelte/easing";

    let { size = 24, color = "currentColor", strokeWidth = 1.5, class: className = "" } = $props();

    // Configuration
    const VIEWBOX_SIZE = 24;
    const CENTER = VIEWBOX_SIZE / 2;
    const RADIUS = 9; // Slightly smaller than 12 to account for stroke
    const POINTS_COUNT = 12; // Divisible by 3, 4, 6 for smooth mapping

    // Shape Definitions
    // Helper to generate points
    function getCirclePoints(count: number, r: number, offsetAngle: number = 0) {
        return Array.from({ length: count }, (_, i) => {
            const theta = (i / count) * Math.PI * 2 - Math.PI / 2 + offsetAngle; // Start at top
            return [CENTER + r * Math.cos(theta), CENTER + r * Math.sin(theta)];
        });
    }

    function getPolygonPoints(sides: number, count: number, r: number, offsetAngle: number = 0) {
        // We need to map 'count' points onto a 'sides'-sided polygon
        const points = [];
        const corners = [];
        // Generate corners first
        for (let i = 0; i < sides; i++) {
            const theta = (i / sides) * Math.PI * 2 - Math.PI / 2 + offsetAngle;
            corners.push([CENTER + r * Math.cos(theta), CENTER + r * Math.sin(theta)]);
        }

        // Interpolate points between corners
        const pointsPerSide = count / sides;
        for (let i = 0; i < sides; i++) {
            const start = corners[i];
            const end = corners[(i + 1) % sides];
            for (let j = 0; j < pointsPerSide; j++) {
                const t = j / pointsPerSide;
                points.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
            }
        }
        return points;
    }

    // Define shapes as flat arrays of coordinates [x1, y1, x2, y2, ...] for tweening
    const shapes = {
        circle: getCirclePoints(POINTS_COUNT, RADIUS).flat(),
        triangle: getPolygonPoints(3, POINTS_COUNT, RADIUS, 0).flat(),
        square: getPolygonPoints(4, POINTS_COUNT, RADIUS, Math.PI / 4).flat(), // Rotate 45deg to stand on corner? Or 0 for flat. Let's do 45 (Math.PI/4) for a diamond/square look or 0.
        // Let's try square flat: offset Math.PI/4 ensures it's an "X" shape or standard square depending.
        // Standard square with flat top: offset = Math.PI/4
        square_flat: getPolygonPoints(4, POINTS_COUNT, RADIUS, Math.PI / 4).flat(),
        hexagon: getPolygonPoints(6, POINTS_COUNT, RADIUS, 0).flat(),
    };

    // State
    // We tween the points array
    const points = tweened(shapes.hexagon, {
        duration: 800,
        easing: cubicInOut,
    });

    // Rotation tween
    const rotation = tweened(0, {
        duration: 20000, // Very slow continuous rotation base
        easing: (t) => t, // Linear
    });

    let currentShapeIndex = 0;
    const shapeKeys = Object.keys(shapes) as Array<keyof typeof shapes>;
    let interval: ReturnType<typeof setInterval>;

    // Cycle shapes
    function nextShape() {
        currentShapeIndex = (currentShapeIndex + 1) % shapeKeys.length;
        const nextKey = shapeKeys[currentShapeIndex];
        points.set(shapes[nextKey]);
    }

    onMount(() => {
        // Start morphing loop
        interval = setInterval(nextShape, 3000); // Change shape every 3 seconds

        // Start continuous slow rotation (simulated by resetting and looping if needed, or just CSS)
        // Actually, CSS is better for continuous rotation. We'll use tweened for "snap" rotations if we want.
        // Let's stick to CSS for the continuous spin and use tweened for the header morph.
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });

    // Convert flat array to polygon points string
    let pointsString = $derived(
        $points
            .reduce((acc, val, i) => {
                if (i % 2 === 0) {
                    acc.push(`${val},${$points[i + 1]}`);
                }
                return acc;
            }, [] as string[])
            .join(" "),
    );
</script>

<div class="geometric-icon-wrapper {className}" style:width="{size}px" style:height="{size}px">
    <svg
        width={size}
        height={size}
        viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}"
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
        class="geometric-icon"
    >
        <!-- Defs for glow filter -->
        <defs>
            <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        <!-- Main morphing shape -->
        <polygon points={pointsString} class="morph-shape" />

        <!-- Inner static decoration for extra "tech" feel -->
        <circle cx={CENTER} cy={CENTER} r={2} fill={color} class="center-dot" />
        <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 4}
            stroke={color}
            stroke-opacity="0.2"
            stroke-dasharray="2 4"
            class="outer-ring"
        />
    </svg>
</div>

<style>
    .geometric-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .geometric-icon {
        overflow: visible;
    }

    .morph-shape {
        filter: drop-shadow(0 0 4px var(--accent-primary, #89b4fa));
        transition: filter 0.3s ease;
    }

    /* Continuous rotation for the whole group or just the shape */
    .morph-shape {
        transform-origin: center;
        animation: slow-spin 20s linear infinite;
    }

    .outer-ring {
        transform-origin: center;
        animation: reverse-spin 30s linear infinite;
    }

    .center-dot {
        opacity: 0.8;
        transform-origin: center;
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes slow-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes reverse-spin {
        from {
            transform: rotate(360deg);
        }
        to {
            transform: rotate(0deg);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
            opacity: 0.8;
        }
        50% {
            transform: scale(1.5);
            opacity: 0.4;
        }
    }
</style>
