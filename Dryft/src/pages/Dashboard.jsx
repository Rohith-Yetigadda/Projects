import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserItineraries } from '../services/db';
import gsap from 'gsap';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadTrips = async () => {
      try {
        const userTrips = await getUserItineraries(currentUser.uid);
        setTrips(userTrips);
      } catch (err) {
        console.error("Failed to load trips", err);
      }
      setLoading(false);
    };

    loadTrips();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.dashboard-content', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return null; // Or a sleek loading skeleton

  return (
    <div className="dashboard container">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Your Journeys</h1>
            <p className="dashboard-subtitle">{currentUser?.email}</p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
            <button className="btn btn-primary" onClick={() => navigate('/app/planner')}>+ New Journey</button>
          </div>
        </header>

        <main>
          {trips.length === 0 ? (
            <div className="empty-state">
              <h2 className="empty-title">No journeys planned yet</h2>
              <p className="empty-desc">
                Describe your dream destination and let Dryft construct a flawlessly tailored itinerary in seconds.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/app/planner')}>
                Start Planning
              </button>
            </div>
          ) : (
            <div className="trips-grid">
              {/* TripCards will go here once we implement them */}
              {trips.map(trip => (
                <div key={trip.id} style={{ border: '1px solid var(--clr-border)', padding: '24px', borderRadius: '8px' }}>
                  <h3>{trip.destination}</h3>
                  <p style={{ color: 'var(--clr-text-muted)' }}>{trip.days} Days</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
