import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";

import Nav from '../components/Nav';
import API from '../services/API';

export default function Reset() {
  const [ password, setPassword ] = useState<string>('');
  const [ errorMessage, setErrorMessage ] = useState<string>(); 

  const navigate = useNavigate();
  const { email, token } = useParams<{ email: string, token: string }>();

  useEffect(() => {
    console.log('here', email, token);
    if(!email || !token){
      navigate('/');
    }
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(password){
      const data = new FormData();
        
      data.append('password', password);
      data.append('email', email || '');
      data.append('token', token || '');

      API.request('reset-password', {
        method: 'POST',
        body: data}).then(() => {
          setErrorMessage('Password reset successfully');
        }, (message: string) => {
          setErrorMessage(message);
        })
    }
  };

  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  return (
    <div className="page">
      <Nav account={false} />

      <form onSubmit={submit}>

        <fieldset>
          <label htmlFor="password">New Password: </label>
          <input id="password" type="password" onChange={change} autoComplete="off" />
        </fieldset>

        <input type="submit" value="Submit" />
      </form>

      <div className="error-message">
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}
