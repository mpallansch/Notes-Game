import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import Nav from './Nav';
import API from '../services/API';
import Context from '../context';

import { itemsPerPage } from '../shared/Shared';

import '../styles/Home.scss';

export default function Home() {
  const { player, setPlayer } = (useContext<any>(Context));
  const [ errorMessage, setErrorMessage ] = useState<string>();
  const [ gameId, setGameId ] = useState<string>('');
  const [ joining, setJoining ] = useState<string>('');
  const [ passphrase, setPassphrase ] = useState<string>('');
  const [ publicGame, setPublicGame ] = useState<boolean>(true);
  const [ publicGames, setPublicGames ] = useState<Array<string>>([]);
  const [ pageNumber, setPageNumber ] = useState<number>(0);

  const navigate = useNavigate();

  const checkGameStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let formData = new FormData();

    formData.append('gameId', gameId);
    formData.append('passphrase', passphrase);
    formData.append('public', publicGame ? 'true' : 'false');

    if(joining === 'host'){
      API.request(`create-game`, {
        method: 'POST',
        body: formData
      }).then(() => {
        player.inGame = gameId;
        setPlayer(player);
        navigate(`/game/${gameId}/${passphrase || 'public'}`);
      }, (msg: string) => {
        setErrorMessage(msg);
      });
    } else {
      join(gameId, formData);
    }
  };

  const join = (joiningGameId: string, formData: FormData) => {
    API.request(`is-game-joinable`, {
      method: 'POST',
      body: formData
    }).then((response: any) => {
      if(response.joinable === true) {
        navigate(`/game/${joiningGameId}/${passphrase || 'public'}`)
      } else {
        setErrorMessage(response.message);
      }
    }, (msg: string) => {
      setErrorMessage(msg);
    });
  };

  const leaveGame = () => {
    API.request(`leave-game?gameId=${player.inGame}`).then((response: Array<string>) => {
      window.location.reload();
    });
  };

  const publicGameClick = (clickedGameId: string) => {
    let formData = new FormData();
    formData.append('gameId', clickedGameId);
    join(clickedGameId, formData);
  };

  const getPublicGames = (page: number = pageNumber) => {
    API.request(`public-games?page=${page}`).then((response: Array<string>) => {
      setPublicGames(response);
    });
  }

  const decrementPage = () => {
    if(pageNumber > 0) {
      getPublicGames(pageNumber - 1);
      setPageNumber(Math.max(0, pageNumber - 1));
    }
  }

  const incrementPage = () => {
    if(publicGames.length === itemsPerPage){
      getPublicGames(pageNumber + 1);
      setPageNumber(pageNumber + 1);
    } 
  }
  
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(getPublicGames, []);

  if(!player) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page home">
      <Nav player={player} />

      <div className="content-container">
        {player.inGame && (
          <p id="already-connected-message">It looks like your account is already playing a game. If you lost connection, try to <button onClick={() => {navigate(`/game/${player.inGame}/reconnect`)}}>Reconnect</button> or you can <button onClick={leaveGame}>Leave Game</button></p>
        )}

        {!player.inGame && (
          <div className="page-body">
            <div id="enter-game-buttons">
              <button id="host" onClick={() => {setJoining('host')}}>Host Game</button>
              <button id="join" onClick={() => {setJoining('join')}}>Join Game</button>
            </div>

            { joining && (
              <form onSubmit={checkGameStatus}>
                <h2>{joining === 'host' ? 'Hosting New Game:' : 'Joining Game'}</h2>
                <fieldset>
                  <label htmlFor="game-name">Game Name:</label>
                  <input id="game-name" type="text" value={gameId} onChange={(e) => {setGameId(e.target.value)}} />
                </fieldset>

                { !publicGame && (
                  <fieldset>
                    <label htmlFor="passphrase">Passphrase:</label>
                    <input id="passphrase" type="text" value={passphrase} onChange={(e) => {setPassphrase(e.target.value)}} />
                  </fieldset>
                )}

                <fieldset>
                  <input name="availability" type="radio" id="public-game" value="true" checked={publicGame} onChange={() => {setPublicGame(true)}}/>
                  <label htmlFor="public-game">Public</label>
                  <input name="availability" type="radio" id="private-game" value="false" checked={!publicGame} onChange={() => {setPublicGame(false)}}/>
                  <label htmlFor="private-game">Private</label>
                </fieldset>

                <input type="submit" value="Submit" />
              </form>
            )}

            {errorMessage && <div>{errorMessage}</div>}

            <div id="public-game-list">
              <button id="refresh-button" onClick={() => {getPublicGames()}}>Refresh</button>

              <span id="available-games-header">Available Games</span>

              <span id="page-indicator">Page {pageNumber + 1}</span>

              { publicGames.length === 0 && (
                <p>No public games are currently open! Try creating a new one above.</p>
              )}
              { publicGames.length > 0 && (
                <ul>
                  {publicGames.map((game: any, index: number) => (
                    <li key={`game-list-${index}`}><button onClick={() => {publicGameClick(game.name)}}><span className="game-name">{game.name}</span><span className="player-count">Players: {game.players}/8</span><span className="ready-count">Ready: {game.ready}/{game.players}</span></button></li>
                  ))}
                </ul>
              )}
              <button id="previous" onClick={decrementPage}>&lt;</button>
              <button id="next" onClick={incrementPage}>&gt;</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
