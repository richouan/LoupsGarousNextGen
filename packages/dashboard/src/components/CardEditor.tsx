import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Image as ImageIcon, Shield, PawPrint, Eye, Moon, Sun, Crown, Copy, Edit3, Trash2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUtils';

interface CardEditorProps {
  onClose: () => void;
  onSave: (cardData: any) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  initialCard?: any | null;
}

// Removed presets

export const CardEditor: React.FC<CardEditorProps> = ({
  onClose,
  onSave,
  onDelete,
  initialCard
}) => {
  const [name, setName] = useState('');
  const [camp, setCamp] = useState('VILLAGEOIS');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUnique, setIsUnique] = useState(true);
  const [abilityType, setAbilityType] = useState('NIGHT');
  const [difficulty, setDifficulty] = useState(1);
  const [replyMode, setReplyMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  useEffect(() => {
    // Scroll to top of the page when editor opens
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (initialCard) {
      setName(initialCard.name || '');
      setCamp(initialCard.camp || 'VILLAGEOIS');
      setDescription(initialCard.description || '');
      setShortDescription(initialCard.shortDescription || '');
      setImageUrl(initialCard.imageUrl || '');
      setIsUnique(initialCard.isUnique ?? true);
      setAbilityType(initialCard.abilityType || 'NIGHT');
      setDifficulty(initialCard.difficulty || 1);
      setReplyMode(initialCard.replyMode || '');
    } else {
      setName('');
      setCamp('VILLAGEOIS');
      setDescription('');
      setShortDescription('');
      setImageUrl('');
      setIsUnique(true);
      setAbilityType('NIGHT');
      setDifficulty(1);
      setReplyMode('');
    }
  }, [initialCard]);

  // Track unsaved changes
  useEffect(() => {
    if (!initialCard) {
      const isDirty = name !== '' || camp !== 'VILLAGEOIS' || description !== '' || shortDescription !== '' || imageUrl !== '' || !isUnique || abilityType !== 'NIGHT' || difficulty !== 1;
      setHasChanges(isDirty);
      return;
    }

    const isDirty = name !== (initialCard.name || '')
      || camp !== (initialCard.camp || 'VILLAGEOIS')
      || description !== (initialCard.description || '')
      || shortDescription !== (initialCard.shortDescription || '')
      || imageUrl !== (initialCard.imageUrl || '')
      || isUnique !== (initialCard.isUnique ?? true)
      || abilityType !== (initialCard.abilityType || 'NIGHT')
      || difficulty !== (initialCard.difficulty || 1);
    
    setHasChanges(isDirty);
  }, [name, camp, description, shortDescription, imageUrl, isUnique, abilityType, difficulty, initialCard]);

  const handleClose = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave without saving?')) return;
    }
    onClose();
  };

  const handleReset = () => {
    if (initialCard) {
      setName(initialCard.name || '');
      setCamp(initialCard.camp || 'VILLAGEOIS');
      setDescription(initialCard.description || '');
      setShortDescription(initialCard.shortDescription || '');
      setImageUrl(initialCard.imageUrl || '');
      setIsUnique(initialCard.isUnique ?? true);
      setAbilityType(initialCard.abilityType || 'NIGHT');
      setDifficulty(initialCard.difficulty || 1);
      setReplyMode(initialCard.replyMode || '');
    } else {
      setName('');
      setCamp('VILLAGEOIS');
      setDescription('');
      setShortDescription('');
      setImageUrl('');
      setIsUnique(true);
      setAbilityType('NIGHT');
      setDifficulty(1);
      setReplyMode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setLoading(true);
    try {
      await onSave({
        id: initialCard?.id,
        name: name.trim(),
        camp,
        description: description.trim(),
        shortDescription: shortDescription.trim() || null,
        imageUrl: imageUrl.trim() || null,
        isUnique,
        abilityType,
        difficulty,
        replyMode: replyMode || null
      });
    } catch (err) {
      console.error('Failed to save card:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lg_auth_token')}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const finalUrl = data.url.startsWith('http') ? data.url : `http://localhost:3001${data.url}`;
      setImageUrl(finalUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="card-editor-layout">
      {/* Top Header / Back Button + Actions (Sticky on Mobile) */}
      <div className="card-editor-header">
        <button
          onClick={handleClose}
          className="editor-back-btn"
          type="button"
        >
          <ArrowLeft size={18} />
          <span>Retour aux rôles</span>
        </button>

        <div className="editor-header-actions">
          {hasChanges && (
            <div className="header-save-actions">
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                className="btn btn-gold btn-sm"
                type="button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {initialCard && onDelete && (
            <button
              onClick={async () => {
                if (deleteStep === 0) {
                  setDeleteStep(1);
                } else if (deleteStep === 1) {
                  setDeleteStep(2);
                } else if (deleteStep === 2) {
                  setLoading(true);
                  try {
                    await onDelete(initialCard.id);
                  } catch (err) {
                    console.error('Failed to delete card:', err);
                    setDeleteStep(0);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
              className="editor-delete-btn"
              type="button"
              style={{
                background: deleteStep > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                border: deleteStep > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                color: '#ef4444',
                padding: deleteStep === 0 ? '0.4rem' : '0.4rem 0.8rem'
              }}
              title="Delete Role"
            >
              <Trash2 size={deleteStep === 0 ? 18 : 16} />
              {deleteStep === 1 ? 'r u suure !!!!!!' : deleteStep === 2 ? 'delete permanante !!!!' : null}
            </button>
          )}
        </div>
      </div>

      <div className="editor-grid">
        {/* Left Side: Card Live Preview */}
        <div className="editor-preview-pane">
          <div className="card-preview-container">
            <div className="card-preview-image">
              <label style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                background: 'var(--bg-dark-surface)',
                padding: '8px',
                borderRadius: '50%',
                border: '2px solid var(--border-gold-dim)',
                color: 'var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease',
                opacity: 0.9
              }}
              title="Upload Photo"
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Edit3 size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              {imageUrl ? (
                <img src={getOptimizedImageUrl(imageUrl, 'thumb')} alt="Preview" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              ) : (
                <div className="placeholder-image">🐺</div>
              )}
            </div>
            <div className="card-preview-footer">
              <p className={`camp-label camp-${(camp || '').toLowerCase()}`}>
                {camp === 'VILLAGEOIS' ? '🛡️ Villageois' : camp === 'LOUPS' ? '🐺 Loup Garou' : '🔮 Solo'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="editor-form-pane dark-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Role Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chasseur, Seer..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Camp / Faction *</label>
                <div className="segmented-control">
                  <button type="button" className={camp === 'VILLAGEOIS' ? 'active-village' : ''} onClick={() => setCamp('VILLAGEOIS')}><span><Shield size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Villageois</span></button>
                  <button type="button" className={camp === 'LOUPS' ? 'active-loups' : ''} onClick={() => setCamp('LOUPS')}><span><PawPrint size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Loup Garou</span></button>
                  <button type="button" className={camp === 'SOLITAIRE' ? 'active-solo' : ''} onClick={() => setCamp('SOLITAIRE')}><span><Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Solo</span></button>
                </div>
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Ability Type</label>
                <div className="segmented-control">
                  <button type="button" className={abilityType === 'NIGHT' ? 'active-night' : ''} onClick={() => setAbilityType('NIGHT')}><span><Moon size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Night</span></button>
                  <button type="button" className={abilityType === 'DAY' ? 'active' : ''} onClick={() => setAbilityType('DAY')}><span><Sun size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Day</span></button>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <div className="segmented-control">
                  <button type="button" className={isUnique ? 'active' : ''} onClick={() => setIsUnique(true)}><span><Crown size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Unique</span></button>
                  <button type="button" className={!isUnique ? 'active' : ''} onClick={() => setIsUnique(false)}><span><Copy size={14} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} /> Repeat</span></button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty (1-5)</label>
                <div className="segmented-control">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={star <= difficulty ? `active-diff-${difficulty}` : ''}
                      onClick={() => setDifficulty(star)}
                    >
                      <span>{star} ★</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Short Summary</label>
              <input
                type="text"
                className="form-control"
                placeholder="One sentence about this role's power..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Description & Rules *</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Detailed rules, night actions, win conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

          </form>
        </div>
      </div>

      {hasChanges && (
        <div className="unsaved-banner desktop-only-banner">
          <span>Careful — you have unsaved changes!</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>Reset</button>
            <button className="btn btn-gold" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
