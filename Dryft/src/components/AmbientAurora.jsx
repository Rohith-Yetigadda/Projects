import { useEffect, useRef } from 'react';
import { useLenis } from '../hooks/useLenis';
import './AmbientAurora.css';

export default function AmbientAurora() {
  const containerRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);

  useEffect(() => {
    let animationFrameId;
    
    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    // Initial base positions
    const orbs = [
      { ref: orb1Ref, x: 0, y: 0, vx: 0, vy: 0, baseX: 30, baseY: 40, speed: 0.0005, angle: 0, radius: 40 },
      { ref: orb2Ref, x: 0, y: 0, vx: 0, vy: 0, baseX: 70, baseY: 60, speed: 0.0004, angle: 2, radius: 30 },
      { ref: orb3Ref, x: 0, y: 0, vx: 0, vy: 0, baseX: 50, baseY: 80, speed: 0.0003, angle: 4, radius: 50 }
    ];

    const render = () => {
      const scrollY = window.scrollY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      orbs.forEach((orb) => {
        // Orbit
        orb.angle += orb.speed;
        const targetX = orb.baseX + Math.cos(orb.angle) * 10;
        const targetY = orb.baseY + Math.sin(orb.angle) * 10;

        // Convert target percentages to pixels for physics
        const pxTargetX = (targetX / 100) * vw;
        const pxTargetY = (targetY / 100) * vh;
        
        // Mouse Repulsion
        const dxMouse = orb.x - mouse.x;
        const dyMouse = orb.y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        let repelX = 0;
        let repelY = 0;
        const repelRadius = 400;

        if (distMouse < repelRadius) {
          const force = Math.pow((repelRadius - distMouse) / repelRadius, 2) * 8; 
          repelX = (dxMouse / distMouse) * force;
          repelY = (dyMouse / distMouse) * force;
        }

        // Spring to base + subtle scroll parallax
        const parallaxY = scrollY * 0.1;
        const dxBase = pxTargetX - orb.x;
        const dyBase = (pxTargetY - parallaxY) - orb.y;
        
        const springForce = 0.02;
        orb.vx += (dxBase * springForce) + repelX;
        orb.vy += (dyBase * springForce) + repelY;

        // Friction
        orb.vx *= 0.85;
        orb.vy *= 0.85;

        orb.x += orb.vx;
        orb.y += orb.vy;

        // Apply via transform for 60fps hardware acceleration
        if (orb.ref.current) {
          orb.ref.current.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0)`;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Initialize orb positions instantly
    orbs.forEach(orb => {
      orb.x = (orb.baseX / 100) * window.innerWidth;
      orb.y = (orb.baseY / 100) * window.innerHeight;
    });

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="aurora-container" ref={containerRef} aria-hidden="true">
      <div className="aurora-orb orb-1" ref={orb1Ref} />
      <div className="aurora-orb orb-2" ref={orb2Ref} />
      <div className="aurora-orb orb-3" ref={orb3Ref} />
    </div>
  );
}
