import * as THREE from 'three';

/**
 * Custom lunar shader material providing realistic terminator shading and authentic NASA LROC WAC albedo relief.
 */
export const LunarSurfaceShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uDayColor: { value: new THREE.Color('#948F85') },
    uNightColor: { value: new THREE.Color('#0B0A09') },
    uTerminatorColor: { value: new THREE.Color('#3D362E') },
    uAlbedoMap: { value: null as THREE.Texture | null },
    uHasTexture: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDirection;
    uniform vec3 uDayColor;
    uniform vec3 uNightColor;
    uniform vec3 uTerminatorColor;
    uniform sampler2D uAlbedoMap;
    uniform float uHasTexture;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    // Simple procedural noise fallback if texture is not bound
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 sunDir = normalize(uSunDirection);

      // Diffuse solar illumination
      float NdotL = dot(normal, sunDir);

      vec3 baseAlbedo;
      if (uHasTexture > 0.5) {
        // Authentic NASA LRO / LROC WAC Global Mosaic
        vec4 texColor = texture2D(uAlbedoMap, vUv);
        baseAlbedo = texColor.rgb;
      } else {
        // Micro-texture for highland regolith fallback
        float regolith = noise(vUv * 80.0) * 0.12 + noise(vUv * 240.0) * 0.05;
        baseAlbedo = uDayColor + vec3(regolith);
      }

      // Smooth terminator transition with polar illumination compensation
      // Real lunar polar topography consists of steep crater rims (15°-35° slopes) that
      // catch horizontal solar rays. On a smooth sphere, normal.y dominates at the poles,
      // artificially forcing NdotL to zero and crushing albedo to gray.
      // We calculate horizontal solar alignment to keep the sunlit hemisphere of polar crater rims
      // crisp and recognizable while preserving realistic shadowing on the night side.
      float polarProximity = smoothstep(0.65, 0.98, abs(normal.y));
      vec2 horizNormal = normalize(normal.xz + vec2(0.0001));
      vec2 horizSun = normalize(sunDir.xz + vec2(0.0001));
      float horizSunAlignment = max(0.0, dot(horizNormal, horizSun));

      float effectiveNdotL = mix(NdotL, max(NdotL, horizSunAlignment * 0.75), polarProximity);
      float terminator = smoothstep(-0.08, 0.12, effectiveNdotL);

      float minSunlitFactor = mix(0.05, 0.35, polarProximity);
      vec3 surfaceColor = mix(uNightColor, baseAlbedo * max(minSunlitFactor, effectiveNdotL), terminator);

      // Subtle limb brightening characteristic of airless lunar regolith (Lommel-Seeliger law approximation)
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float limb = 1.0 - max(0.0, dot(normal, viewDir));
      surfaceColor += uTerminatorColor * pow(limb, 4.0) * terminator * 0.3;

      gl_FragColor = vec4(surfaceColor, 1.0);
    }
  `
};
