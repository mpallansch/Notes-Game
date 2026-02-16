import { useState, useContext } from 'react';
import Nav from './Nav';
import Context from '../context';
import API from '../services/API';
import { useSettings, Theme, FontSize } from '../context/SettingsContext';

import '../styles/Settings.scss';

export default function Settings() {
  const { player, setPlayer } = useContext<any>(Context);
  const { settings, updateSetting } = useSettings();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);
    if (!newUsername.trim()) return;

    try {
      const data = await API.request('change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      });
      setPlayer(data);
      setNewUsername('');
      setUsernameSuccess(true);
    } catch (err: any) {
      setUsernameError(typeof err === 'string' ? err : err?.message || 'Failed to update username.');
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      updateSetting('notificationsEnabled', permission === 'granted');
    } catch (_) {
      setNotificationPermission('denied');
    }
  };

  return (
    <div className="page">
      <Nav player={player} />

      <div className="settings-content">
        <h1>Settings</h1>

        <section className="settings-section">
          <h2>Sound</h2>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.soundMuted}
              onChange={(e) => updateSetting('soundMuted', e.target.checked)}
            />
            <span className="toggle-label">Mute sound effects</span>
          </label>
        </section>

        <section className="settings-section">
          <h2>Theme</h2>
          <div className="settings-options">
            <label className="settings-option">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={settings.theme === 'light'}
                onChange={() => updateSetting('theme', 'light' as Theme)}
              />
              <span>Light</span>
            </label>
            <label className="settings-option">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={settings.theme === 'dark'}
                onChange={() => updateSetting('theme', 'dark' as Theme)}
              />
              <span>Dark</span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Notifications</h2>
          <p className="settings-description">Get notified when it&apos;s your turn (browser notifications)</p>
          {notificationPermission === 'granted' ? (
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
              />
              <span className="toggle-label">Turn alerts enabled</span>
            </label>
          ) : (
            <button type="button" onClick={requestNotificationPermission}>
              Enable notifications
            </button>
          )}
        </section>

        <section className="settings-section">
          <h2>Accessibility</h2>
          <div className="settings-option-group">
            <label className="settings-option">
              <span className="option-label">Font size</span>
              <select
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', e.target.value as FontSize)}
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra large</option>
              </select>
            </label>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => updateSetting('highContrast', e.target.checked)}
            />
            <span className="toggle-label">High contrast mode</span>
          </label>
        </section>

        {player && (
          <section className="settings-section">
            <h2>Account</h2>
            <form onSubmit={handleUsernameSubmit} className="settings-form">
              <label>
                <span className="option-label">Change username</span>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={player.username}
                  maxLength={32}
                />
              </label>
              <button type="submit" disabled={!newUsername.trim() || newUsername.trim() === player.username}>
                Update username
              </button>
              {usernameError && <p className="error-message">{usernameError}</p>}
              {usernameSuccess && <p className="success-message">Username updated successfully.</p>}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
