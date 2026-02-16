import React, { useState, useContext } from 'react';
import { useNavigate, Link } from "react-router-dom";

import API from '../services/API';
import Context from '../context';

import { PlayerInfo, validate } from '../shared/Shared';

import '../styles/Login.scss';

export default function Login() {
  const { setPlayer } = useContext<any>(Context);

  const [ userInfo, setUserInfo ] = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [ errorMessage, setErrorMessage ] = useState<string>('');

  const navigate = useNavigate();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userInfo.email?.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!userInfo.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    API.request('login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userInfo.email, password: userInfo.password }),
    }).then((response: PlayerInfo) => {
      setPlayer(response);
      navigate('/home');
    }, (message: string) => {
      setErrorMessage(message);
    });
  };

  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo((prev) => ({ ...prev, [event.target.id]: event.target.value }));
  };

  return (
    <div className="page login vertically-centered">
      <form onSubmit={submit}>
        <div className="header"><span>Passing</span><span>Notes</span></div>

        <fieldset>
          <label htmlFor="email"><strong>Email: </strong></label>
          <input id="email" type="email" value={userInfo.email} onChange={change} autoComplete="email" />
        </fieldset>

        <fieldset>
          <label htmlFor="password"><strong>Password: </strong></label>
          <input id="password" type="password" value={userInfo.password} onChange={change} autoComplete="current-password" />
        </fieldset>

        <input type="submit" value="Log In" />

        <fieldset>
          <p className="form-footer">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </fieldset>

        <fieldset>
          <label id="description">a party game about creating wacky sentences</label>
        </fieldset>
      </form>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
