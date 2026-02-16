import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import API from '../services/API';

import '../styles/Login.scss';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    API.request('verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((data: any) => {
        setStatus('success');
        setMessage(data?.message || 'Account verified successfully! You can now log in.');
      })
      .catch((msg: string) => {
        setStatus('error');
        setMessage(msg);
      });
  }, [token]);

  return (
    <div className="page login vertically-centered">
      <div className="verify-email-container">
        <div className="header"><span>Passing</span><span>Notes</span></div>

        {status === 'loading' && (
          <p>Verifying your email...</p>
        )}

        {status === 'success' && (
          <div className="success-message">
            <p>{message}</p>
            <p><Link to="/">Log in to play</Link></p>
          </div>
        )}

        {status === 'error' && (
          <div className="error-message">
            <p>{message}</p>
            <p><Link to="/register">Register again</Link> or <Link to="/">return to login</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
