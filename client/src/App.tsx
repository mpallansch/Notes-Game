import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route
} from "react-router-dom";

import CheckLogin from './components/CheckLogin';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import Reset from './components/Reset';
import Settings from './components/Settings';
import Game from './components/Game';
import Home from './components/Home';
import Sounds from './services/Sounds';
import Context from './context';
import { useSettings } from './context/SettingsContext';

import './styles/App.scss';

export default function App() {
  const [ player, setPlayer ] = useState<any>(undefined);
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
    document.documentElement.setAttribute('data-high-contrast', settings.highContrast ? 'true' : 'false');
  }, [settings.theme, settings.fontSize, settings.highContrast]);

  useEffect(() => {
    const handler = (e: Event) => {
      if(!e.target) return;
      const targetEl = e.target as HTMLElement;

      if((targetEl.tagName === 'BUTTON' || (targetEl.tagName === 'INPUT' && targetEl.getAttribute('type') === 'submit')) && !settings.soundMuted){
        Sounds.tap.play();
      }
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [settings.soundMuted]);

  return (
    <div className="App">
      <Context.Provider value={{ player, setPlayer }}>
        <HashRouter>
          <CheckLogin />

          <Routes>
            <Route path="/home" element={<Home/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/game/:gameId/:passphrase" element={<Game/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/verify-email/:token" element={<VerifyEmail/>} />
            <Route path="/reset/:email/:token" element={<Reset/>} />
            <Route path="/" element={<Login/>} />
          </Routes>
        </HashRouter>
      </Context.Provider>
    </div>
  );
}
