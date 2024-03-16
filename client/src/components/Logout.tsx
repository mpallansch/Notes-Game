import React, { useContext } from 'react';
import { useNavigate } from "react-router-dom";

import API from '../services/API';
import Context from '../context';

export default function Logout() {
  const { setPlayer } = useContext<any>(Context);

  const navigate = useNavigate();

  const logout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    API.request('logout').then(() => {
      setPlayer(undefined);
      navigate('/');
    }, () => {
      setPlayer(undefined);
      navigate('/');
    });
  };

  return (
    <button onClick={logout}>Logout</button>
  );
}
