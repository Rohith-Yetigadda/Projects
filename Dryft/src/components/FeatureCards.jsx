import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Map, Zap, Plane } from 'lucide-react';
import './FeatureCards.css';

gsap.registerPlugin(ScrollTrigger);

export default function FeatureCards() {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    // Ultra-smooth 60fps ScrollTrigger reveal
    const ctx = gsap.context(() => {
      gsap.fromTo(cardsRef.current, 
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%', 
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const addToRefs = (el) => {
    if (el && !cardsRef.current.includes(el)) {
      cardsRef.current.push(el);
    }
  };

  return (
    <section className="features" ref={containerRef} id="features">
      <div className="container">
        <div className="features__grid">
          
          <div className="feature-card" ref={addToRefs}>
            <div className="feature-card__icon-wrap">
              <Map size={20} strokeWidth={1.5} />
            </div>
            <h3>Structured Itineraries</h3>
            <p>Day-by-day routing optimized for travel distance, pacing, and your selected preferences.</p>
          </div>
          
          <div className="feature-card" ref={addToRefs}>
            <div className="feature-card__icon-wrap">
              <Zap size={20} strokeWidth={1.5} />
            </div>
            <h3>Instant Generation</h3>
            <p>Powered by advanced LLMs to build comprehensive travel plans in under 10 seconds.</p>
          </div>
          
          <div className="feature-card" ref={addToRefs}>
            <div className="feature-card__icon-wrap">
              <Plane size={20} strokeWidth={1.5} />
            </div>
            <h3>Ready to Execute</h3>
            <p>Export your itinerary or view it directly in the app. Clean, readable, and perfectly organized.</p>
          </div>

        </div>
      </div>
    </section>
  );
}