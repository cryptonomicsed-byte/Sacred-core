import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WaveShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#F27D26') },
    uFrequency: { value: 2.0 },
    uAmplitude: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    uniform float uFrequency;
    uniform float uAmplitude;

    void main() {
      vUv = uv;
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      
      float elevation = sin(modelPosition.x * uFrequency + uTime) * 
                        sin(modelPosition.z * uFrequency + uTime) * 
                        uAmplitude;
      
      modelPosition.y += elevation;
      vElevation = elevation;

      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      gl_Position = projectionPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vElevation;
    uniform vec3 uColor;

    void main() {
      float strength = vElevation * 2.0 + 0.5;
      vec3 color = mix(vec3(0.0, 0.0, 0.0), uColor, strength);
      gl_FragColor = vec4(color, 0.8);
    }
  `,
};

const WaveMesh = ({ color = '#F27D26' }) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const { viewport } = useThree();
  
  const uniforms = useMemo(() => ({
    ...WaveShader.uniforms,
    uColor: { value: new THREE.Color(color) },
  }), [color]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    mesh.current.material.uniforms.uTime.value = time;
    mesh.current.rotation.y = time * 0.1;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 3, 0, 0]}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2, 64, 64]} />
      <shaderMaterial
        vertexShader={WaveShader.vertexShader}
        fragmentShader={WaveShader.fragmentShader}
        uniforms={uniforms}
        transparent
        wireframe
      />
    </mesh>
  );
};

export const SonicWaveform: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <WaveMesh color={color} />
      </Canvas>
    </div>
  );
};
