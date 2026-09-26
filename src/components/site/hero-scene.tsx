"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, Vector2, type ShaderMaterial } from "three";

/** Générateur pseudo-aléatoire déterministe (mulberry32) : rendu pur et reproductible. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bubbleVertex = /* glsl */ `
  attribute float aSize; attribute float aSpeed; attribute float aPhase;
  uniform float uTime; uniform float uPR; uniform vec2 uMouse;
  varying float vA;
  void main(){
    vec3 p=position;
    p.y=mod(p.y+uTime*aSpeed+7.0,14.0)-7.0;
    p.x+=sin(uTime*.6+aPhase)*.35+uMouse.x*(p.z+5.0)*.12;
    p.y+=uMouse.y*(p.z+5.0)*.08;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=aSize*uPR*(9.0/-mv.z);
    vA=smoothstep(-7.0,-3.0,p.y)*(1.0-smoothstep(3.5,7.0,p.y))*.9;
  }`;

const bubbleFragment = /* glsl */ `
  varying float vA;
  void main(){
    vec2 c=gl_PointCoord-.5; float d=length(c);
    float ring=smoothstep(.5,.42,d)*smoothstep(.30,.42,d);
    float core=smoothstep(.22,.0,d)*.25;
    float hl=smoothstep(.12,.0,length(c-vec2(-.13,.13)))*.8;
    float a=(ring*.55+core+hl)*vA;
    gl_FragColor=vec4(vec3(.95,.93,.9)*.55+vec3(.87,.65,.65)*.25, a);
  }`;

const raysVertex = /* glsl */ `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const raysFragment = /* glsl */ `varying vec2 vUv; uniform float uTime;
  void main(){ float x=vUv.x*7.0+uTime*.05+sin(vUv.y*3.0)*.3; float r=pow(max(0.0,sin(x)*.5+.5),5.0)*pow(max(0.0,sin(x*2.7+1.3)*.5+.5),2.0);
    float fade=smoothstep(.1,.9,vUv.y)*smoothstep(1.0,.55,vUv.y); gl_FragColor=vec4(vec3(.5,.7,.95),r*fade*.11); }`;

function Sea({ count, target }: { count: number; target: React.RefObject<Vector2> }) {
  const bubbles = useRef<ShaderMaterial>(null);
  const rays = useRef<ShaderMaterial>(null);
  const mouse = useRef(new Vector2());
  const gl = useThree((s) => s.gl);

  const attrs = useMemo(() => {
    const r = rng(20211);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 18;
      pos[i * 3 + 1] = (r() - 0.5) * 14;
      pos[i * 3 + 2] = (r() - 0.5) * 8 - 1;
      size[i] = r() * r() * 22 + 3;
      speed[i] = 0.15 + r() * 0.5;
      phase[i] = r() * 6.28;
    }
    return { pos, size, speed, phase };
  }, [count]);

  const bubbleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPR: { value: gl.getPixelRatio() },
      uMouse: { value: new Vector2() },
    }),
    [gl],
  );
  const rayUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    mouse.current.lerp(target.current, 0.04);
    if (bubbles.current) {
      bubbles.current.uniforms.uTime!.value = t;
      (bubbles.current.uniforms.uMouse!.value as Vector2).copy(mouse.current);
    }
    if (rays.current) rays.current.uniforms.uTime!.value = t;
    camera.position.x = mouse.current.x * 0.3;
    camera.position.y = mouse.current.y * 0.2;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[attrs.pos, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[attrs.size, 1]} />
          <bufferAttribute attach="attributes-aSpeed" args={[attrs.speed, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[attrs.phase, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={bubbles}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={bubbleUniforms}
          vertexShader={bubbleVertex}
          fragmentShader={bubbleFragment}
        />
      </points>
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[30, 20]} />
        <shaderMaterial
          ref={rays}
          transparent
          depthWrite={false}
          uniforms={rayUniforms}
          vertexShader={raysVertex}
          fragmentShader={raysFragment}
        />
      </mesh>
    </>
  );
}

/** Scène du hero : bulles et rayons de lumière sous-marins (React Three Fiber). */
export default function HeroScene() {
  const wrapper = useRef<HTMLDivElement>(null);
  const target = useRef(new Vector2());
  const [visible, setVisible] = useState(true);
  const [count] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 700 ? 200 : 380,
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      update();
    });
    if (wrapper.current) io.observe(wrapper.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", update);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrapper} id="sea" aria-hidden="true">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.25]}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        camera={{ fov: 55, near: 0.1, far: 100, position: [0, 0, 8] }}
      >
        <Sea count={count} target={target} />
      </Canvas>
    </div>
  );
}
