import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from "react-router-dom";

import API from '../services/API';
import Context from '../context';
import config from '../constants/Config';

import { PlayerInfo } from '../shared/Shared';

import '../styles/Login.scss';

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: { sitekey: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

export default function Login() {
  const { setPlayer } = useContext<any>(Context);

  const [ userInfo, setUserInfo ] = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [ errorMessage, setErrorMessage ] = useState<string>('');
  const [ requiresCaptcha, setRequiresCaptcha ] = useState<boolean>(false);
  const captchaWidgetId = useRef<number | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    API.request('login-captcha-required')
      .then((data: any) => setRequiresCaptcha(data?.requiresCaptcha ?? false))
      .catch(() => setRequiresCaptcha(false));
  }, []);

  useEffect(() => {
    if (!requiresCaptcha || !captchaContainerRef.current || !config.recaptchaSiteKey) return;

    const renderCaptcha = () => {
      if (window.grecaptcha && captchaContainerRef.current && captchaWidgetId.current === null) {
        captchaWidgetId.current = window.grecaptcha.render(captchaContainerRef.current, {
          sitekey: config.recaptchaSiteKey,
        });
      }
    };

    if (window.grecaptcha) {
      renderCaptcha();
    } else {
      const checkGrecaptcha = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(checkGrecaptcha);
          renderCaptcha();
        }
      }, 100);
      return () => clearInterval(checkGrecaptcha);
    }
  }, [requiresCaptcha]);

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

    let recaptchaResponse = '';
    if (requiresCaptcha && window.grecaptcha && captchaWidgetId.current !== null) {
      recaptchaResponse = window.grecaptcha.getResponse(captchaWidgetId.current);
    }

    const body: { email: string; password: string; recaptchaResponse?: string } = {
      email: userInfo.email,
      password: userInfo.password,
    };
    if (requiresCaptcha && recaptchaResponse) {
      body.recaptchaResponse = recaptchaResponse;
    }

    API.request('login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((response: PlayerInfo) => {
      setPlayer(response);
      navigate('/home');
    }, (error: string | { message: string; requiresCaptcha: boolean }) => {
      const message = typeof error === 'string' ? error : error.message;
      const needsCaptcha = typeof error === 'object' && error.requiresCaptcha;
      setErrorMessage(message);
      if (needsCaptcha && !requiresCaptcha) {
        setRequiresCaptcha(true);
      }
      if (requiresCaptcha && window.grecaptcha && captchaWidgetId.current !== null) {
        window.grecaptcha.reset(captchaWidgetId.current);
      }
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

        {requiresCaptcha && (
          <fieldset className="captcha-fieldset">
            <div ref={captchaContainerRef} className="g-recaptcha-container" />
          </fieldset>
        )}

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
