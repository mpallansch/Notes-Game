import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import API from '../services/API';
import config from '../constants/Config';
import { validate } from '../shared/Shared';

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

export default function Register() {
  const [userInfo, setUserInfo] = useState<{ email: string; username: string; password: string; confirm: string }>({
    email: '',
    username: '',
    password: '',
    confirm: '',
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [requiresCaptcha, setRequiresCaptcha] = useState<boolean>(false);
  const captchaWidgetId = useRef<number | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    API.request('register-captcha-required')
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
    setErrorMessage('');
    setSuccessMessage('');

    if (!validate('email', userInfo.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!validate('username', userInfo.username)) {
      setErrorMessage('Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-');
      return;
    }
    if (!validate('password', userInfo.password)) {
      setErrorMessage('Password must be at least 12 characters and contain at least one letter and one number.');
      return;
    }
    if (userInfo.password !== userInfo.confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const body: { email: string; username: string; password: string; recaptchaResponse?: string } = {
      email: userInfo.email,
      username: userInfo.username,
      password: userInfo.password,
    };
    if (requiresCaptcha && window.grecaptcha && captchaWidgetId.current !== null) {
      const token = window.grecaptcha.getResponse(captchaWidgetId.current);
      if (token) body.recaptchaResponse = token;
    }

    API.request('register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((data: any) => {
        setSuccessMessage(data?.message || 'Registration successful! Please check your email for a verification link.');
      })
      .catch((message: string) => {
        setErrorMessage(message);
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
        <h2>Create Account</h2>

        <fieldset>
          <label htmlFor="email"><strong>Email: </strong></label>
          <input id="email" type="email" value={userInfo.email} onChange={change} autoComplete="email" required />
        </fieldset>

        <fieldset>
          <label htmlFor="username"><strong>Username: </strong></label>
          <input id="username" type="text" value={userInfo.username} onChange={change} autoComplete="username" required />
        </fieldset>

        <fieldset>
          <label htmlFor="password"><strong>Password: </strong></label>
          <input id="password" type="password" value={userInfo.password} onChange={change} autoComplete="new-password" required />
        </fieldset>

        <fieldset>
          <label htmlFor="confirm"><strong>Confirm Password: </strong></label>
          <input id="confirm" type="password" value={userInfo.confirm} onChange={change} autoComplete="new-password" required />
        </fieldset>

        {requiresCaptcha && (
          <fieldset className="captcha-fieldset">
            <div ref={captchaContainerRef} className="g-recaptcha-container" />
          </fieldset>
        )}

        <input type="submit" value="Register" />

        <fieldset>
          <p className="form-footer">
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </fieldset>
      </form>

      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
          <p><Link to="/">Return to login</Link></p>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
