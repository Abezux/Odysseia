import React, { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // 3 horizontal ribbons with dual sines and phase offsets
  float y1 = 0.48 + 0.07 * sin(uv.x * 3.2 + u_time * 0.35) + 0.035 * sin(uv.x * 6.5 - u_time * 0.22);
  float d1 = abs(uv.y - y1);
  vec3 c1 = smoothstep(0.07, 0.005, d1) * vec3(0.961, 0.647, 0.141); // amber #F5A524

  float y2 = 0.50 + 0.065 * sin(uv.x * 4.1 + u_time * 0.28 + 1.6) + 0.04 * sin(uv.x * 8.0 + u_time * 0.3);
  float d2 = abs(uv.y - y2);
  vec3 c2 = smoothstep(0.055, 0.005, d2) * vec3(1.0, 0.835, 0.541); // pale gold #FFD58A

  float y3 = 0.46 + 0.06 * sin(uv.x * 2.7 - u_time * 0.25 + 3.1) + 0.03 * sin(uv.x * 5.8 + u_time * 0.18);
  float d3 = abs(uv.y - y3);
  vec3 c3 = smoothstep(0.075, 0.005, d3) * vec3(0.722, 0.686, 0.639); // warm gray #B8AFA3

  // Added together so crossings bloom to pale cream
  vec3 color = c1 + c2 + c3;
  
  // Soft centre glow
  float glow = exp(-d1 * 12.0) * 0.28 + exp(-d2 * 12.0) * 0.28;
  color += glow * vec3(1.0, 0.95, 0.85);

  float alpha = clamp((color.r + color.g + color.b) * 0.45, 0.0, 0.9);
  gl_FragColor = vec4(color, alpha);
}
`;

export function HeroRibbonShader(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let animId: number;
    const startTime = performance.now();

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Try WebGL
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });

    if (gl) {
      const createShader = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };

      const prog = gl.createProgram()!;
      gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
      gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const posLoc = gl.getAttribLocation(prog, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const timeLoc = gl.getUniformLocation(prog, 'u_time');
      const resLoc = gl.getUniformLocation(prog, 'u_resolution');

      const renderGL = (now: number) => {
        if (isVisible) {
          const t = (now - startTime) * 0.001;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform1f(timeLoc, t);
          gl.uniform2f(resLoc, canvas.width, canvas.height);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        animId = requestAnimationFrame(renderGL);
      };

      animId = requestAnimationFrame(renderGL);
    } else {
      // 2D Canvas Fallback
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const render2D = (now: number) => {
          if (isVisible) {
            const t = (now - startTime) * 0.001;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'screen';

            const drawRibbon = (
              color: string,
              yOffset: number,
              f1: number,
              s1: number,
              f2: number,
              s2: number,
              lineWidth: number
            ) => {
              ctx.beginPath();
              ctx.strokeStyle = color;
              ctx.lineWidth = lineWidth * dpr;
              ctx.lineCap = 'round';

              for (let x = 0; x <= canvas.width; x += 10) {
                const u = x / canvas.width;
                const y =
                  canvas.height *
                  (yOffset + 0.07 * Math.sin(u * f1 + t * s1) + 0.035 * Math.sin(u * f2 - t * s2));
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            };

            drawRibbon('rgba(245, 165, 36, 0.45)', 0.48, 3.2, 0.35, 6.5, 0.22, 16);
            drawRibbon('rgba(255, 213, 138, 0.45)', 0.50, 4.1, 0.28, 8.0, 0.3, 12);
            drawRibbon('rgba(184, 175, 163, 0.35)', 0.46, 2.7, 0.25, 5.8, 0.18, 14);
          }
          animId = requestAnimationFrame(render2D);
        };
        animId = requestAnimationFrame(render2D);
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none mix-blend-screen opacity-35"
      style={{ zIndex: 2 }}
    />
  );
}
