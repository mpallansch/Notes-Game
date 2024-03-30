import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route
} from "react-router-dom";

import CheckLogin from './components/CheckLogin';
import Login from './components/Login';
import Reset from './components/Reset';
import Settings from './components/Settings';
import Game from './components/Game';
import Home from './components/Home';
import Sounds from './services/Sounds';
import Context from './context';

import './styles/App.scss';

export default function App() {
  const [ player, setPlayer ] = useState<any>(undefined);

  useEffect(() => {
    window.addEventListener('click', (e: Event) => {
      if(!e.target) return;
      const targetEl = e.target as HTMLElement;

      if(targetEl.tagName === 'BUTTON' || (targetEl.tagName === 'INPUT' && targetEl.getAttribute('type') === 'submit')){
        Sounds.tap.play();
      }
    });
  }, []);

  return (
    <div className="App">
      <Context.Provider value={{ player, setPlayer }}>
        <HashRouter>
          <CheckLogin />

          <Routes>
            <Route path="/home" element={<Home/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/game/:gameId/:passphrase" element={<Game/>} />
            <Route path="/reset/:email/:token" element={<Reset/>} />
            <Route path="/" element={<Login/>} />
          </Routes>
        </HashRouter>
      </Context.Provider>
    </div>
  );
}
