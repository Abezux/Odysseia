import * as THREE from 'three';

/**
 * Custom lunar shader material providing realistic terminator shading and lunar albedo relief.
 */
export const LunarSurfaceShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uDayColor: { value: new THREE.Color('#948F85') },
    uNightColor: { value: new THREE.Color('#0B0A09') },
    uTerminatorColor: { value: new THREE.Color('#3D362E') }
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

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    // Simple procedural noise for lunar regolith texture
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

      // Micro-texture for highland regolith
      float regolith = noise(vUv * 80.0) * 0.12 + noise(vUv * 240.0) * 0.05;

      vec3 baseAlbedo = uDayColor + vec3(regolith);

      // Smooth terminator transition
      float terminator = smoothstep(-0.08, 0.12, NdotL);
      vec3 surfaceColor = mix(uNightColor, baseAlbedo * max(0.05, NdotL), terminator);

      // Subtle limb brightening characteristic of airless lunar regolith (Lommel-Seeliger law approximation)
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float limb = 1.0 - max(0.0, dot(normal, viewDir));
      surfaceColor += uTerminatorColor * pow(limb, 4.0) * terminator * 0.3;

      gl_FragColor = vec4(surfaceColor, 1.0);
    }
  `
};
