import React, { useState, useEffect } from 'react';
import { Hash, Folder, ShieldCheck, MessageSquare, Server, PlusCircle } from 'lucide-react';

interface SettingsTabProps {
  settings: any;
  channels: any[];
  onSaveSettings: (updated: any) => Promise<void>;
  selectedGuildName: string;
  selectedGuildId?: string;
  onGoHome?: () => void;
}

const ToggleSetting = ({ icon: Icon, title, description, checked, onChange, danger = false }: any) => (
  <div className="setting-row">
    <div className="setting-info">
      <div className="setting-icon" style={danger ? { color: 'var(--wolf-red)', borderColor: 'rgba(139, 26, 26, 0.3)', background: 'rgba(139, 26, 26, 0.1)' } : {}}>
        <Icon size={18} />
      </div>
      <div className="setting-text">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
    <label className={`toggle-switch ${danger ? 'danger' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider"></span>
    </label>
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  channels,
  onSaveSettings,
  selectedGuildName,
  selectedGuildId,
  onGoHome
}) => {
  const [form, setForm] = useState<any>({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const isGlobalMode = selectedGuildId === 'global' || selectedGuildName === 'Global Role Management';

  if (isGlobalMode) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '0.35rem' }}>Channels & Behavior</h1>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
            Configure where and how the bot listens on your Discord servers.
          </p>
        </div>

        <div
          className="glass-panel"
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-gold-dim)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 28px rgba(234, 179, 8, 0.2)'
            }}
          >
            <Server size={34} color="var(--gold)" />
          </div>

          <h2
            className="fantasy-font"
            style={{ fontSize: '1.4rem', color: 'var(--text-cream)', marginBottom: '0.75rem', letterSpacing: '0.03em' }}
          >
            Configuration Réservée aux Serveurs
          </h2>

          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
            Cet onglet est uniquement accessible lorsque vous êtes dans un serveur Discord. 
            Le mode <strong>👑 Bibliothèque Globale</strong> gère uniquement les cartes et règles globales.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={onGoHome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1.6rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(234, 179, 8, 0.3)'
              }}
            >
              <PlusCircle size={18} />
              <span>Gérer / Ajouter un Serveur Discord</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categories = channels.filter((c) => c.type === 4);
  const textChannels = channels.filter((c) => c.type === 0);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(settings);

  const toggleChannel = (channelId: string) => {
    const list = form.allowedChannelIds || [];
    const exists = list.includes(channelId);
    const updated = exists ? list.filter((id: string) => id !== channelId) : [...list, channelId];
    setForm({ ...form, allowedChannelIds: updated });
  };

  const toggleCategory = (categoryId: string) => {
    const list = form.allowedCategoryIds || [];
    const exists = list.includes(categoryId);
    const updated = exists ? list.filter((id: string) => id !== categoryId) : [...list, categoryId];
    setForm({ ...form, allowedCategoryIds: updated });
  };

  const toggleIgnored = (channelId: string) => {
    const list = form.ignoredChannelIds || [];
    const exists = list.includes(channelId);
    const updated = exists ? list.filter((id: string) => id !== channelId) : [...list, channelId];
    setForm({ ...form, ignoredChannelIds: updated });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSaveSettings(form);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: hasChanges ? '6rem' : '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.2rem' }}>Channels & Behavior</h1>
        <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
          Configure where and how the bot listens on <strong>{selectedGuildName}</strong>.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Panel 1: Listening Channels */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Folder size={20} color="var(--gold)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Category Listeners</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
              {categories.map((cat) => {
                const checked = (form.allowedCategoryIds || []).includes(cat.id);
                return (
                  <ToggleSetting
                    key={cat.id}
                    icon={Folder}
                    title={cat.name}
                    description="Listen in all channels under this category"
                    checked={checked}
                    onChange={() => toggleCategory(cat.id)}
                  />
                );
              })}
              {categories.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No categories found.</p>}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Hash size={20} color="var(--gold)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Channel Listeners</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
              {textChannels.map((chan) => {
                const checked = (form.allowedChannelIds || []).includes(chan.id);
                return (
                  <ToggleSetting
                    key={chan.id}
                    icon={Hash}
                    title={`#${chan.name}`}
                    description="Listen specifically in this channel"
                    checked={checked}
                    onChange={() => toggleChannel(chan.id)}
                  />
                );
              })}
              {textChannels.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No text channels found.</p>}
            </div>
          </div>

        </div>

        {/* Panel 2: Response & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquare size={20} color="var(--gold)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Response Mode</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Method</label>
              <select
                className="form-control"
                value={form.deliveryMethod || 'PUBLIC'}
                onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
              >
                <option value="PUBLIC">📢 Public Reply (in the channel)</option>
                <option value="DM">✉️ Direct Message (via DM)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Reply Format</label>
              <select
                className="form-control"
                value={form.defaultReplyMode || 'BOTH'}
                onChange={(e) => setForm({ ...form, defaultReplyMode: e.target.value })}
              >
                <option value="BOTH">✨ Embed (Text + Photo)</option>
                <option value="TEXT_ONLY">📜 Embed (Text Only - no photo)</option>
                <option value="PHOTO_ONLY">🖼️ Artwork Only (Image only)</option>
                <option value="PLAIN_TEXT">💬 Plain Text (No embed)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Auto-Delete Timer: {form.autoDeleteSeconds ? `${form.autoDeleteSeconds}s` : 'Disabled'}
              </label>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={form.autoDeleteSeconds || 0}
                onChange={(e) => setForm({ ...form, autoDeleteSeconds: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Security & Limits</h3>
            </div>

            <ToggleSetting
              icon={MessageSquare}
              title="Allow Direct Messages"
              description="Players can DM the bot directly for rules"
              checked={form.allowDms ?? true}
              onChange={(e: any) => setForm({ ...form, allowDms: e.target.checked })}
            />

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Player Cooldown: {form.userCooldownSeconds || 3}s</label>
              <input
                type="range"
                min="1"
                max="15"
                value={form.userCooldownSeconds || 3}
                onChange={(e) => setForm({ ...form, userCooldownSeconds: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>
          </div>

          <div className="glass-panel" style={{ borderColor: 'rgba(139, 26, 26, 0.3)', background: 'rgba(20, 10, 10, 0.6)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Hash size={20} color="var(--wolf-red)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--wolf-red)' }}>Ignored Channels</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '1rem' }}>
              The bot will completely ignore commands in these channels (Absolute Blacklist).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
              {textChannels.map((chan) => {
                const checked = (form.ignoredChannelIds || []).includes(chan.id);
                return (
                  <ToggleSetting
                    key={chan.id}
                    icon={Hash}
                    title={`#${chan.name}`}
                    description="Blacklist this channel"
                    checked={checked}
                    onChange={() => toggleIgnored(chan.id)}
                    danger={true}
                  />
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {hasChanges && (
        <div className="unsaved-banner">
          <span>Careful — you have unsaved channel settings!</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setForm({ ...settings })}>Reset</button>
            <button className="btn btn-gold" type="button" onClick={handleSubmit}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
