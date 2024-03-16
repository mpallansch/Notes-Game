
import { Link } from "react-router-dom";

import Logout from './Logout';

export default function Nav({account = true}: {account?: boolean}) {
  return (
    <nav>
      {account && (
        <ul>
          <li>
            <Link to="/home">Home</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
          <li>
            <Logout />
          </li>
        </ul>
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
