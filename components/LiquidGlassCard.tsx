import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';

const ParticleOrb = ({ color = '#F27D26', speed = 1 }) => {
  const points = useRef<THREE.Points>(null!);
  
  const particlesCount = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 1.5 + Math.random() * 0.5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    points.current.rotation.y = time * 0.2 * speed;
    points.current.rotation.z = time * 0.1 * speed;
    
    // Pulse effect
    const s = 1 + Math.sin(time * 2) * 0.05;
    points.current.scale.set(s, s, s);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface LiquidGlassCardProps {
  title: string;
  description: string;
  brandColor?: string;
  onOpen: () => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({ 
  title, 
  description, 
  brandColor = '#F27D26',
  onOpen 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative group w-full aspect-[4/5] rounded-3xl overflow-hidden liquid-glass cursor-pointer"
      onClick={onOpen}
    >
      {/* Three.js Background */}
      <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <ParticleOrb color={brandColor} speed={1.5} />
        </Canvas>
      </div>

      {/* Glass Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
      
      {/* Content */}
      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full animate-pulse" 
              style={{ backgroundColor: brandColor, boxShadow: `0 0 10px ${brandColor}` }} 
            />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-mono">DNA Active</span>
          </div>
          
          <h3 className="text-3xl font-display uppercase tracking-tight text-white group-hover:text-brand-primary transition-colors">
            {title}
          </h3>
          
          <p className="text-sm text-white/60 line-clamp-2 font-light leading-relaxed">
            {description}
          </p>
          
          <div className="pt-4 flex items-center justify-between">
            <button 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-colors"
            >
              <Zap className="w-4 h-4 text-brand-primary" />
              Open Workspace
            </button>
            <ExternalLink className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
          </div>
        </div>
      </div>

      {/* Hover Bloom Effect */}
      <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
        <div 
          className="absolute inset-0 blur-[100px]" 
          style={{ background: `radial-gradient(circle at center, ${brandColor}, transparent)` }} 
        />
      </div>
    </motion.div>
  );
};
