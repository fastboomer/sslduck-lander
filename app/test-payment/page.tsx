'use client';

import { useState } from 'react';

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [priceId, setPriceId] = useState('');
  const [email, setEmail] = useState('testuser@example.com');
  const [firstName, setFirstName] = useState('Test');
  const [planType, setPlanType] = useState('6_month');
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          email,
          firstName,
          planType,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        setError(data.error || 'Failed to initialize checkout');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6">
      <div className="bg-[#1e1b4b] border border-[#4c1d95] rounded-xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-[#a78bfa] mb-6 text-center">Stripe Webhook Tester</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stripe Price ID (Test Mode)</label>
            <input 
              type="text" 
              value={priceId}
              onChange={e => setPriceId(e.target.value)}
              placeholder="price_something"
              className="w-full bg-[#0a0a0f] text-white rounded p-3 border border-[#4c1d95] focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">Get this from your Stripe Dashboard (Products)</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Test Email (Optional but Recommended)</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0f] text-white rounded p-3 border border-[#4c1d95]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Plan Type</label>
            <select 
              value={planType}
              onChange={e => setPlanType(e.target.value)}
              className="w-full bg-[#0a0a0f] text-white rounded p-3 border border-[#4c1d95]"
            >
              <option value="6_month">6 Month Plan</option>
              <option value="12_month">12 Month Plan</option>
            </select>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button 
            onClick={handleCheckout}
            disabled={loading || !priceId}
            className="w-full mt-4 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white font-bold py-3 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Go to Stripe Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
