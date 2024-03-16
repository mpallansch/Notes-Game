import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from "react-router-dom";

import API from '../services/API';
import Context from '../context';

import { PlayerInfo } from '../shared/Shared';

export default function CheckLogin () {
  const { setPlayer } = useContext<any>(Context);

  const [ loginChecked, setLoginChecked ] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if(!loginChecked){
      setLoginChecked(true);
  
      API.request('check-login').then((response: PlayerInfo) => {
        setPlayer(response);
  
        if(location.pathname === '/'){
          navigate('/home');
        }
      }, () => {
        if(location.pathname.indexOf('/reset') !== 0){
          navigate('/');
        }
      });
    }
  }, [ navigate, location, loginChecked, setLoginChecked, setPlayer ]);

  return <></>
}
