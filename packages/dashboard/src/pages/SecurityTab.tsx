import React from 'react';
import { ShieldAlert, ShieldCheck, Zap, Lock, Users, Clock } from 'lucide-react';

interface SecurityTabProps {
  settings: any;
  selectedGuildName: string;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ settings, selectedGuildName }) => {
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginBottom: '0.15rem' }}>
          Anti-Spam Protection
        </h1>
        <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
          Ensures stability and prevents flood attacks on <strong>{selectedGuildName}</strong>.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Card 1: User Cooldown */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Clock size={18} color="var(--gold)" />
            <h3>User Cooldown</h3>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gold)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            {settings?.userCooldownSeconds || 3}s
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dark-secondary)', lineHeight: '1.5' }}>
            Minimum interval between two requests from the same player. If a user tries to flood the channel by typing role names repeatedly, the bot discreetly reacts with ⏳ and blocks extra responses.
          </p>
        </div>

        {/* Card 2: Channel Cooldown */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Zap size={18} color="var(--gold)" />
            <h3>Channel Protection (Anti-Raid)</h3>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gold)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            {settings?.channelCooldownSeconds || 1}s
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dark-secondary)', lineHeight: '1.5' }}>
            Prevents coordinated waves of multiple users from flooding a channel simultaneously by limiting the global publish rate per channel.
          </p>
        </div>

        {/* Card 3: Sliding Window */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} color="#059669" />
            <h3>Sliding-Window Algorithm</h3>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#059669', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-title)', fontSize: '0.85rem' }}>
            <ShieldCheck size={16} /> ACTIVE & PROTECTED
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dark-secondary)', lineHeight: '1.5' }}>
            The in-memory sliding window algorithm fingerprints messages and recycles memory every 60 seconds to ensure near-zero CPU and RAM impact.
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Narrator Best Practices</h3>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-dark-secondary)', lineHeight: '1.7' }}>
          <li>Isolate card commands in a dedicated channel like <code style={{ background: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px' }}>#role-lookup</code> or <code style={{ background: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px' }}>#village-debates</code>.</li>
          <li>Use <strong>Secret Reveal</strong> mode (ephemeral button) to prevent villagers from quietly discovering which role a player is looking up mid-game.</li>
          <li>Enable <strong>Auto-Delete</strong> (15-30s) to keep debate channels clean and readable.</li>
        </ul>
      </div>
    </div>
  );
};
