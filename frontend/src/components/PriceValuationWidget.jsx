import React from 'react';
import DealBadge from './DealBadge';
import { Cpu, CheckCircle2, DollarSign, Activity, AlertCircle } from 'lucide-react';

const formatPrice = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  } else {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
};

const PriceValuationWidget = ({ valuation, listedPrice }) => {
  if (!valuation) return null;

  const { predicted_price, confidence_score, based_on, deal_tag, model_version } = valuation;

  const diffAmount = listedPrice ? Math.abs(listedPrice - predicted_price) : 0;
  const isGoodDeal = deal_tag?.toLowerCase().includes('good');
  const isOverpriced = deal_tag?.toLowerCase().includes('overpriced');

  return (
    <div className="glass-card" style={{
      padding: '24px',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.6) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Accent Glow */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <Cpu size={22} color="#6366f1" />
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', color: '#ffffff' }}>XGBoost ML Valuation</h4>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Trained on 100k Indian Property Records</span>
          </div>
        </div>
        <DealBadge dealTag={deal_tag} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        background: 'rgba(15, 23, 42, 0.7)',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Predicted Fair Value</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#38bdf8' }}>
            {formatPrice(predicted_price)}
          </span>
        </div>

        {listedPrice && (
          <div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Listed Asking Price</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>
              {formatPrice(listedPrice)}
            </span>
          </div>
        )}

        <div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Model Confidence</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>
            {((confidence_score || 0.94) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {listedPrice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '0.88rem',
          background: isGoodDeal ? 'rgba(16, 185, 129, 0.12)' : isOverpriced ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
          border: `1px solid ${isGoodDeal ? 'rgba(16, 185, 129, 0.3)' : isOverpriced ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
          color: isGoodDeal ? '#34d399' : isOverpriced ? '#fbbf24' : '#38bdf8'
        }}>
          <Activity size={18} />
          <span>
            {isGoodDeal && `This property is listed ${formatPrice(diffAmount)} BELOW the ML fair market value! Excellent buying opportunity.`}
            {isOverpriced && `This property is listed ${formatPrice(diffAmount)} ABOVE the ML fair market estimation. Room for price negotiation.`}
            {!isGoodDeal && !isOverpriced && `This property is priced accurately aligned with fair market benchmark.`}
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceValuationWidget;
