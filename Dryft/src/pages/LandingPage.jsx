import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import FeatureCards from '../components/FeatureCards';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  
  // Refs for GSAP animation
  const titleLine1Ref = useRef(null);
  const titleLine2Ref = useRef(null);
  const subtitleRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Initial states
      gsap.set([subtitleRef.current, actionsRef.current], { 
        opacity: 0, 
        y: 20 
      });
      
      gsap.set([titleLine1Ref.current, titleLine2Ref.current], { 
        yPercent: 100,
        opacity: 0
      });

      // Start animating
      tl.to([titleLine1Ref.current, titleLine2Ref.current], {
        yPercent: 0,
        opacity: 1,
        duration: 1.0,
        stagger: 0.1,
        delay: 0.2
      })
      .to(subtitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8
      }, "-=0.6")
      .to(actionsRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8
      }, "-=0.6");
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <main className="landing" ref={containerRef}>
      {/* Hero section */}
      <section className="landing__hero" ref={heroRef}>
        <div className="container">
          <div className="landing__hero-inner">
            
            <h1 className="landing__title">
              <span className="landing__title-line-wrap">
                <span className="landing__title-line" ref={titleLine1Ref}>Go anywhere.</span>
              </span>
              <span className="landing__title-line-wrap">
                <span className="landing__title-line" ref={titleLine2Ref}>Plan nothing.</span>
              </span>
            </h1>
            
            <p className="landing__subtitle" ref={subtitleRef}>
              A single prompt. An entire journey. Dryft translates your imagination into a flawlessly structured itinerary.
            </p>

            <div className="landing__actions" ref={actionsRef}>
              <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                Start Planning
              </button>
              <button className="btn btn-secondary">
                View Examples
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Feature cards section */}
      <FeatureCards />
      
      <div className="landing__footer-spacer"></div>
    </main>
  );
}
