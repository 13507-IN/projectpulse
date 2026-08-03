"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface GridDistortionProps {
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  imageSrc: string;
  className?: string;
  showGUI?: boolean;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uDataTexture;
  uniform sampler2D uTexture;
  uniform vec4 resolution;
  varying vec2 vUv;
  
  void main() {
    vec2 correctedUV = vUv;
    // Account for aspect ratio differences if needed, though plane scaling should handle it.
    
    vec4 offset = texture2D(uDataTexture, correctedUV);
    
    // The distortion effect is applied by subtracting the offset from the texture coordinates.
    // The '0.02' factor controls the intensity of the distortion.
    gl_FragColor = texture2D(uTexture, correctedUV - 0.02 * offset.rg);
  }
`;

const GridDistortion: React.FC<GridDistortionProps> = ({
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  imageSrc,
  className = '',
  showGUI = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1000, 1000);
    camera.position.z = 1;
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const settings = { grid, mouse, strength, relaxation };
    
    // Data texture for distortion
    const size = settings.grid;
    const data = new Float32Array(4 * size * size);
    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.minFilter = THREE.LinearFilter;
    dataTexture.magFilter = THREE.LinearFilter;
    dataTexture.needsUpdate = true;

    // Main texture
    const textureLoader = new THREE.TextureLoader();
    let imageAspect = 1;
    const mainTexture = textureLoader.load(imageSrc, (texture) => {
        imageAspect = texture.image.width / texture.image.height;
        handleResize();
    });
    mainTexture.minFilter = THREE.LinearFilter;
    mainTexture.magFilter = THREE.LinearFilter;
    mainTexture.wrapS = THREE.ClampToEdgeWrapping;
    mainTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Shader Material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        uDataTexture: { value: dataTexture },
        uTexture: { value: mainTexture },
      },
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
    
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      renderer.setSize(width, height);
      camera.updateProjectionMatrix();

      let planeWidth = 1, planeHeight = 1;
      const containerAspect = width / height;
      if (containerAspect > imageAspect) {
        planeWidth = 1;
        planeHeight = 1 / containerAspect * imageAspect;
      } else {
        planeWidth = containerAspect / imageAspect;
        planeHeight = 1;
      }
      plane.scale.set(planeWidth, planeHeight, 1);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    const mouseState = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      mouseState.vX = x - mouseState.prevX;
      mouseState.vY = y - mouseState.prevY;
      Object.assign(mouseState, { x, y, prevX: x, prevY: y });
    };
    
    container.addEventListener('mousemove', handleMouseMove);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const data = dataTexture.image.data as unknown as Float32Array;
      for (let i = 0; i < size * size; i++) {
        data[i * 4] *= settings.relaxation;
        data[i * 4 + 1] *= settings.relaxation;
      }

      const gridMouseX = size * mouseState.x;
      const gridMouseY = size * mouseState.y;
      const maxDist = size * settings.mouse;

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const distSq = Math.pow(gridMouseX - i, 2) + Math.pow(gridMouseY - j, 2);
          if (distSq < maxDist * maxDist) {
            const index = 4 * (i + size * j);
            const power = maxDist / Math.sqrt(distSq);
            data[index] += settings.strength * 100 * mouseState.vX * power;
            data[index + 1] -= settings.strength * 100 * mouseState.vY * power;
          }
        }
      }
      
      mouseState.vX *= 0.9;
      mouseState.vY *= 0.9;

      dataTexture.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
      if(container && container.contains(renderer.domElement)){
          container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      dataTexture.dispose();
      mainTexture.dispose();
    };
  }, [grid, mouse, strength, relaxation, imageSrc, showGUI]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full ${className}`}
    />
  );
};

export default GridDistortion;
