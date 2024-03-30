import React, { useState, useContext } from 'react';
import { useNavigate } from "react-router-dom";

import API from '../services/API';
import Context from '../context';

import { PlayerInfo, validate } from '../shared/Shared';

import '../styles/Login.scss';

export default function Login() {
  const { setPlayer } = useContext<any>(Context);

  const [ userInfo, setUserInfo ] = useState<any>({});
  const [ errorMessage, setErrorMessage ] = useState<string>('');

  const navigate = useNavigate();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(!validate('username', userInfo.username)){
      setErrorMessage('Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-');
      return;
    }

    const data = new FormData();

    Object.keys(userInfo).forEach((key) => {
      if(key !== 'confirm'){
        data.append(key, userInfo[key]);
      }
    });

    (API.request('login', {
      method: 'POST',
      body: data
    })).then((response: PlayerInfo) => {
      setPlayer(response);
      navigate('/home');
    }, (message: string) => {
      setErrorMessage(message);
    })
  };

  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newUserInfo = JSON.parse(JSON.stringify(userInfo));

    newUserInfo[event.target.id as any] = event.target.value;

    setUserInfo(newUserInfo);
  };

  return (
    <div className="page login vertically-centered">
      <form onSubmit={submit}>
        <div className="header"><span>Passing</span><span>Notes</span></div>

        <fieldset>
          <label htmlFor="username"><strong>Nickname: </strong></label>
          <input id="username" type="text" onChange={change} autoComplete="on" />
        </fieldset>

        <input type="submit" value="Submit" />

        <fieldset>
          <label id="description">a party game about creating wacky sentences</label>
        </fieldset>
      </form>

      {errorMessage && <div className="error-message">
        <p>{errorMessage}</p>
      </div>}
    </div>
  );
}
