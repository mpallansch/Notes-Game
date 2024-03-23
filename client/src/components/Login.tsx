import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

import API from '../services/API';
import Context from '../context';

import { PlayerInfo, validate } from '../shared/Shared';
import config from '../constants/Config';

import '../styles/Login.scss';

declare global {
  interface Window {
    grecaptcha :any;
  }
}


export default function Login() {
  const { setPlayer } = useContext<any>(Context);

  const [ userInfo, setUserInfo ] = useState<any>({});
  const [ loginMode, setLoginMode ] = useState<string>('');
  const [ registerMode, setRegisterMode ] = useState<boolean>(false);
  const [ usernameAvailability, setUsernameAvailability ] = useState<string>('');
  const [ errorMessage, setErrorMessage ] = useState<string>('');

  const navigate = useNavigate();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(registerMode){
      if(!validate('email', userInfo.email)){
        setErrorMessage('Email address not valid');
        return;
      }

      if(!validate('username', userInfo.username)){
        setErrorMessage('Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-');
        return;
      }

      if(!validate('password', userInfo.password)){
        setErrorMessage('Password must be at least 12 characters, contain at least one letter and one number, and can only contain numbers, letters, and these special characters: #?!@$%^&*-');
        return;
      }

      if(userInfo.password !== userInfo.confirm) {
        setErrorMessage('Passwords do not match');
        return;
      }
    }

    const data = new FormData();

    Object.keys(userInfo).forEach((key) => {
      if(key !== 'confirm'){
        data.append(key, userInfo[key]);
      }
    });

    if(window.grecaptcha){
      window.grecaptcha.ready((_: any) => {
        window.grecaptcha
          .execute(config.recaptchaSiteKey, { action: 'submit' })
          .then((token: any) => {
            data.append('g-recaptcha-response', token);

            API.request(loginMode === 'guest' ? 'play-as-guest' : (registerMode ? 'register' : 'login'), {
              method: 'POST',
              body: data}).then((response: PlayerInfo) => {
                setPlayer(response);
                navigate('/home');
              }, (message: string) => {
                setErrorMessage(message);
              })
          })
      })        
    } else {
      setErrorMessage('Could not process at this time. Try again.');
    }
  };

  const checkAvailability = () => {
    if(!validate('username', userInfo.username)){
      setErrorMessage('Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-');
      setUsernameAvailability('');
      return;
    }

    API.request(`check-username-availability?username=${userInfo.username}`).then((response: string) => {
        setUsernameAvailability(response);
      }, (message: string) => {
        setErrorMessage(message);
      })
  }

  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newUserInfo = JSON.parse(JSON.stringify(userInfo));

    newUserInfo[event.target.id as any] = event.target.value;

    setUserInfo(newUserInfo);
  };

  const forgotPassword = () => {
    if(userInfo.email){
      API.request(`forgot-password?email=${encodeURIComponent(userInfo.email)}`).then(() => {
        setErrorMessage('Please follow the link in the email that was sent to the address provided.');
      }, (message: string) => {
        setErrorMessage(message);
      });
    } else {
      setErrorMessage('Enter an email address to try recovering your password');
    }
  };

  useEffect(() => {
    // Add reCaptcha
    if(!document.getElementById('recaptcha-script')){
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = `https://www.google.com/recaptcha/api.js?render=${config.recaptchaSiteKey}`;
      document.body.appendChild(script);
    }
  }, [])

  return (
    <div className="page login vertically-centered">
      <h1>Ransom Notes</h1>
      {!loginMode && <>
        <button onClick={() => setLoginMode('guest')}>Play as guest</button>
        <br/>
        <button onClick={() => setLoginMode('login')}>Login</button>
      </>}
      {loginMode && 
        <form onSubmit={submit}>
          {loginMode === 'login' && <fieldset>
            <label htmlFor="email"><strong>Email: </strong></label>
            <input id="email" type="text" onChange={change} autoComplete="on" />
          </fieldset>}

          {(loginMode !== 'login' || registerMode) && (
            <fieldset>
              <label htmlFor="username"><strong>Username: </strong></label>
              <input id="username" type="text" onChange={change} autoComplete="on" className={usernameAvailability} /> {loginMode === 'login' && <button type="button" onClick={checkAvailability}>Check Availability</button>}
            </fieldset>
          )}

          {loginMode === 'login' && <fieldset>
            <label htmlFor="password"><strong>Password: </strong></label>
            <input id="password" type="password" onChange={change} autoComplete="off" />
          </fieldset>}

          {loginMode === 'login' && registerMode && (
            <fieldset>
              <label htmlFor="confirm"><strong>Confirm Password: </strong></label>
              <input id="confirm" type="password" onChange={change} autoComplete="off" />
            </fieldset>
          )}

          <br/><br/>

          {loginMode === 'login' && !registerMode && <span>Don't have an account? <button type="button" onClick={() => {setRegisterMode(true)}}>Register now</button></span>}
          {loginMode === 'login' && registerMode && <span>Already have an account? <button type="button" onClick={() => {setRegisterMode(false)}}>Login</button></span>}
          
          <br/><br/><br/>

          {loginMode === 'login' && <button type="button" onClick={forgotPassword}>Forgot password?</button>}

          
          <br/><br/>

          {loginMode === 'login' && <button type="button" onClick={() => setLoginMode('guest')}>Play as guest</button>}
          {loginMode === 'guest' && <button type="button" onClick={() => setLoginMode('login')}>Back to login</button>}

          <br/><br/><br/>

          <input type="submit" value="Submit" />
        </form>
      }

      <div className="error-message">
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}
