
import { Link } from "react-router-dom";
import { PlayerInfo } from '../shared/Shared';

import Logout from './Logout';

export default function Nav({account = true, player}: {account?: boolean, player?: PlayerInfo}) {
  return (
    <nav>
      {account && (
        <>
          {player && <span className="username">{player.username}</span>}
          <ul>
            {window.location.hash !== '#/home' && <li>
              <Link to="/home">Home</Link>
            </li>}
            <li>
              <Logout />
            </li>
          </ul>
        </>
      )}
      {!account && (
        <ul>
          <li>
            <Link to="/">Login</Link>
          </li>
        </ul>
      )}
    </nav>
  );
}
