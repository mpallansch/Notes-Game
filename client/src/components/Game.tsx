import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import Context from '../context';
import Sounds from '../services/Sounds';
import config from '../constants/Config';
import constants from '../constants/Constants';

import { PlayerState, GameState, Card, Chair, isActionValid, minPlayers, ACTION_SUBMIT, ACTION_SELECT, PHASE_SUBMITTING, PHASE_SELECTING } from '../shared/Shared';

import '../styles/Game.scss';

export default function Game() {
  const { player, setPlayer } = useContext<any>(Context);

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [ ignored, forceUpdate] = useState<any>(); 
  const [ navShow, setNavShow ] = useState<boolean>();
  const [ socketState, _setSocketState] = useState<any>({initialized: false});
  const [ draftMessage, setDraftMessage ] = useState<string>('');
  const [ gameState, setGameState ] = useState<GameState>();
  const [ messages, _setMessages ] = useState<Array<string>>([]);
  const [ players, setPlayers ] = useState<Array<PlayerState>>([]);
  const [ currentPlayerOffset, setCurrentPlayerOffset ] = useState<number>(-1);
  const [ cardsSelected , setCardsSelected ] = useState<any>({});
  const [ startable, setStartable ] = useState<boolean>(false);
  const [ messagesToggle, setMessagesToggle ] = useState<boolean>(true);

  const { gameId, passphrase } = useParams<{ gameId: string, passphrase: string }>();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  const messagesRef = useRef(messages);
  const setMessages = (data: any) => {
    messagesRef.current = data;
    _setMessages(data);
  };

  const socketRef = useRef(socketState);
  const setSocketState = (data: any) => {
    socketRef.current = data;
    _setSocketState(data);
  };

  const socket = socketState.socket;
  const playerState: any = players.find((p: any) => p.username === player.username);
  const currentChair = gameState?.chairs[currentPlayerOffset];

  const playerStateRef = useRef();
  playerStateRef.current = playerState;

  const getChairPosition = (currentPlayer: boolean, numChairs: number, index: number) => {
    let position = 'south';
    if(!currentPlayer) {
      if(numChairs >= 5 && index === 1){
        position = 'south-west';
      } else if((numChairs === 4 && index === 1) || 
                (numChairs >= 7 && index === 2)) {
        position = 'west';
      } else if((numChairs === 3 && index === 1) || 
                ((numChairs === 5 || numChairs === 6) && index === 2) || 
                (numChairs >= 7 && index === 3)) {
        position = 'north-west';
      } else if((numChairs === 4 && index === 2) || 
                (numChairs === 6 && index === 3) || 
                (numChairs === 8 && index === 4)) {
        position = 'north';
      } else if((numChairs === 3 && index === 2) ||
                (numChairs === 5 && index === 3) ||
                ((numChairs === 6 || numChairs === 7) && index === 4) ||
                (numChairs === 8 && index === 5)) {
        position = 'north-east';
      } else if((numChairs === 4 && index === 3) ||
                (numChairs === 7 && index === 5) ||
                (numChairs === 8 && index === 6)) {
        position = 'east';
      } else if((numChairs === 5 && index === 4) ||
                (numChairs === 6 && index === 5) ||
                (numChairs === 7 && index === 6) || 
                (numChairs === 8 && index === 7)) {
        position = 'south-east';
      }
    }

    return position;
  }

  const connectSocket = () => {
    let newSocket = io(`${config.socketRoot}?gameId=${gameId}&passphrase=${passphrase}`, { withCredentials: true });

    setSocketState({initialized: false, socket: newSocket});
  };

  const sendMessage = () => {
    socket.emit('message', draftMessage);

    setDraftMessage('');
  };

  const ready = () => {
    socket.emit('set-ready', true);
  };

  const unready = () => {
    socket.emit('set-ready', false);
  };

  const begin = () => {
    socket.emit('begin-request');
  };

  const place = (cardIndex: number, x: number, y: number) => {
    const updatedCardsSelected = {...cardsSelected};
    if(!updatedCardsSelected[cardIndex]){
      updatedCardsSelected[cardIndex] = new Card(currentChair.cards[cardIndex].text, x, y)
    } else {
      updatedCardsSelected[cardIndex].x = x;
      updatedCardsSelected[cardIndex].y = y;
    }
    setCardsSelected(updatedCardsSelected)
  }

  const remove = (cardIndex: number) => {
    if(cardsSelected[cardIndex]){
      const updatedCardsSelected = {...cardsSelected};
      delete updatedCardsSelected[cardIndex];
      setCardsSelected(updatedCardsSelected);
    }
  }

  const submit = () => {
    setCardsSelected([]);
    socket.emit('submit', {cardsSubmitted: Object.keys(cardsSelected).map((cardIndex: any) => cardsSelected[cardIndex])});
  };

  const select = (chairIndex: number) => {
    if(gameState && isActionValid(gameState, currentPlayerOffset, ACTION_SELECT, {chairIndex})){
      socket.emit('select', {chairIndex});
    }
  };

  const cardDragStart = (e: any, cardIndex: number) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({cardIndex, xOffset: e.clientX - e.target.getBoundingClientRect().x, yOffset: e.clientY - e.target.getBoundingClientRect().y}));
  }

  const cardDrop = (e: any) => {
    const { xOffset, yOffset, cardIndex } = JSON.parse(e.dataTransfer.getData("text/plain"));
    const noteSpace = document.querySelector('.note-space');
    const noteBoundingRect = noteSpace?.getBoundingClientRect();
    if(noteBoundingRect){
      place(cardIndex, e.clientX - noteBoundingRect.x - xOffset, e.clientY - noteBoundingRect.y - yOffset);
    }
  }

  const cardRemove = (e: any) => {
    const { cardIndex } = JSON.parse(e.dataTransfer.getData("text/plain"));
    remove(cardIndex);
  }

  function cardTouchStart(e: any) {
    e.target.setAttribute('data-x', e.changedTouches[0].clientX - e.target.getBoundingClientRect().x);
    e.target.setAttribute('data-y', e.changedTouches[0].clientY - e.target.getBoundingClientRect().y);
    e.target.style.transform = `translate(${e.target.getBoundingClientRect().x}px, ${e.target.getBoundingClientRect().y}px)`;
    if(e.target.className.indexOf('dragging') === -1){
      e.target.className = e.target.className + ' dragging';
    }
  }

  function cardTouchMove(e: any) {
    e.target.style.transform = `translate(${e.changedTouches[0].clientX - parseInt(e.target.getAttribute('data-x'))}px, ${e.changedTouches[0].clientY - parseInt(e.target.getAttribute('data-y'))}px)`;
  }

  function cardTouchEnd(e: any, cardIndex: number) {
    const noteSpace = document.querySelector('.note-space');
    const noteBoundingRect = noteSpace?.getBoundingClientRect();
    if(noteBoundingRect){
      const x = e.changedTouches[0].clientX - noteBoundingRect.x - parseInt(e.target.getAttribute('data-x'));
      const y = e.changedTouches[0].clientY - noteBoundingRect.y - parseInt(e.target.getAttribute('data-y'));
      if(x > -5 && x < 305 && y > -5 && y < 205){ 
        place(cardIndex, x, y);
        e.target.className = e.target.className.replace(' dragging', '');
        e.target.className = e.target.className.replace('dragging', '');
      } else {
        remove(cardIndex);
        e.target.className = e.target.className.replace(' dragging', '');
        e.target.className = e.target.className.replace('dragging', '');
        e.target.style.transform = '';
      }
    }
  }

  const restart = () => {
    socket.emit('restart');
  }

  const backToLobby = () => {
    socket.emit('back-to-lobby');
  }

  const leave = () => {
    player.inGame = '';
    setPlayer(player);
    socket.emit('leave');
    navigate('/home');
  };

  useEffect(() => {
    connectSocket();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current.socket.disconnect();
    }
  }, []);

  useEffect(() => {
    if(!socketState.initialized && socket){
      setSocketState({initialized: true, socket: socket});

      socket.on('state', (state: GameState) => {
        /* TODO play sounds from state update */
        /* TODO change document title to indicate action */
        /* TODO scroll to relavent updates on the page */

        setGameState(state);
      });
  
      socket.on('players', (players: Array<PlayerState>) => {
        setPlayers(players);

        if(players.length >= minPlayers){
          let ready = 0;
          for(let i = 0; i < players.length; i++){
            if(players[i].ready){
              ready++;

              if(ready === minPlayers){
                setStartable(true);
                return;
              }
            }
          }
        }
        setStartable(false);
      });
  
      socket.on('messages', (messages: Array<string>) => {
        setMessages(messages);
      });
  
      socket.on('message', (message: string) => {
        let updatedMessages = [...messagesRef.current];
        updatedMessages.push(message);
        setMessages(updatedMessages);
      });

      socket.on('kick', () => {
        alert('The host has kicked you from the game!');
        navigate('/home');
      });
  
      socket.on('connect', () => {
        forceUpdate({});
      });
  
      socket.on('disconnect', () => {
        forceUpdate({});
      });

      socket.on('error', (message: string) => {
        alert(message);
        socketRef.current.socket.disconnect();
        navigateRef.current('/');
      });
    }
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [socketState, messages]);

  useEffect(() => {
    if(player && gameState && gameState.started && currentPlayerOffset === -1) {
      let offsetSet: boolean = false;
      for(let i = 0; i < gameState.chairs.length; i++){
        if(gameState.chairs[i].username === player.username){
          setCurrentPlayerOffset(i);
          offsetSet = true;
          break;
        }
      }
      if(!offsetSet){
        setCurrentPlayerOffset(0);
      }
    } 
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [player, gameState]);

  useEffect(() => {
    if(messagesToggle){
      setTimeout(() => {
        let messageEls = document.querySelectorAll('#messages .message');
        if(messageEls && messageEls.length > 0){
          messageEls[messageEls.length - 1].scrollIntoView({behavior: 'smooth'});
        }
      }, 50);
    }
  }, [messages, messagesToggle]);

  useEffect(() => {
    if(!messagesToggle){
      setTimeout(() => {
        let messageEls = document.querySelectorAll('#messages .message');
        if(messageEls && messageEls.length > 0){
          messageEls[messageEls.length - 1].scrollIntoView({behavior: 'smooth'});
        }
      }, 50);
    }
  }, [gameState?.actionHistory, messagesToggle]);
  
  if(!playerState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page">
      <div id="side-nav" className={navShow ? 'show' : ''}>
        <button id="nav-toggle" onClick={() => {setNavShow(!navShow)}}>{navShow ? '<' : '>'}</button>

        <h1>{gameId}</h1>

        <div id="player-list">
          {players.map((playerInList: any) => (
            <p className={`player ${!playerInList.connected ? 'disconnected' : ''}`} key={playerInList.username}>
              <span className={`ready-indicator ${playerInList.ready ? 'ready' : ''}`}></span>
              <span className="player-name">
                {playerInList.username}
              </span>
              {playerState.host && !playerInList.host && <button className="kick-button" onClick={() => {socket.emit('kick-request', playerInList.username)}}>Kick</button>}
              {playerInList.host &&  (
              <span className="host-indicator">
                <svg viewBox="-1 1 21 20">
                  <polygon fill="yellow" points="9.9, 1.1, 3.3, 21.78, 19.8, 8.58, 0, 8.58, 16.5, 21.78"></polygon>
                </svg>
              </span> 
              )}
            </p>
          ))}
        </div>

        <button id="leave-game" type="button" onClick={leave}>Leave Game</button>

        <div id="messages-container">
          <button className="actions-toggle" onClick={() => {setMessagesToggle(true)}}>Messages</button>
          <button className="actions-toggle" onClick={() => {setMessagesToggle(false)}}>Actions</button>
          {!messagesToggle && 
            <div id="messages" className="actions">
              {gameState?.actionHistory.map(action => <p className="message">{action}</p>)}
            </div>
          }
          {messagesToggle && 
            <>
              <div id="messages">
                {messages.length === 0 && (
                  <p className="message">No messages yet!</p>
                )}
                {messages.length !== 0 && messages.map((message, index) => (
                  <p className="message" key={`message${index}`}>{message}</p>
                ))}
              </div>

              <textarea id="draft-message" placeholder="Message" value={draftMessage} onKeyPress={e => {if(e.key === 'Enter') sendMessage()}} onChange={(e) => {setDraftMessage(e.target.value.replace('\n', ''))}}></textarea>
              <button type="button" id="send-message" onClick={sendMessage}>Send</button>
            </>
          }
        </div>
      </div>

      <div id="game-canvas-container">
        {(!gameState || !gameState.started) && 
          <div id="lobby-actions">
            {!playerState.ready && <button type="button" onClick={ready}>Ready</button>}
            {playerState.ready && <button type="button" onClick={unready}>Unready</button>}

            {playerState.host && <button type="button" onClick={begin} disabled={!startable}>Begin</button>}
          </div>
        }
        {gameState && gameState.started && currentPlayerOffset !== -1 &&
          <div id="game-canvas">
            <div className="canvas-header">
              <span className="round-indicator">Round: {gameState.round}</span>
              <span className="turn-indicator">{gameState.chairs[gameState.currentTurn].username}'s turn</span>
              <span className="phase-indicator">
                {gameState.phase === PHASE_SUBMITTING && 'Submitting'}
                {gameState.phase === PHASE_SELECTING && 'Selecting'}
              </span>
            </div>

            <div className="canvas-body">
              {gameState.winner && (<div className="game-over">
                <span className="winner-indicator">{gameState.winner} won the game!</span>
                {!playerState.host && <p>Waiting on host to play again...</p>}
                {playerState.host && <button type="button" onClick={restart}>Restart Game</button>}
                {playerState.host && <button type="button" onClick={backToLobby}>Back to Lobby</button>}
                <button type="button" onClick={leave}>Leave Game</button>
              </div>)}
              { gameState.chairs.map((ignored: any, chairIndex: number) => {
                const adjustedIndex = (chairIndex + currentPlayerOffset) % gameState.chairs.length;
                const chair = gameState.chairs[adjustedIndex];
                const currentPlayer = chair.username === playerState.username;
                const position = getChairPosition(currentPlayer, gameState.chairs.length, chairIndex);

                return (
                  <div className={`chair ${position} player-number-${adjustedIndex}`} key={chair.username}>
                    <p className={`username${adjustedIndex === gameState.currentTurn ? ' turn' : ''}`}>{chair.username}: {chair.points}</p>
                  </div>
                )
              })
              }
              <div className="game-area">
                {gameState.phase === PHASE_SUBMITTING && <>
                  {gameState.currentTurn === currentPlayerOffset && <>
                    Waiting on {gameState.chairs.filter((chair: Chair, chairIndex: number) => gameState.currentTurn !== chairIndex && !chair.submitted).length} players to submit 
                  </>}
                  {gameState.currentTurn !== currentPlayerOffset && !currentChair.submitted && <>
                    <div className="note-space" onDrop={cardDrop} onDragOver={e => e.preventDefault()} onDragEnter={e => e.preventDefault()}>
                      {Object.keys(cardsSelected).map((cardIndex: any) => 
                        <button className="placed-card card" draggable="true" onTouchStart={cardTouchStart} onTouchMove={cardTouchMove} onTouchEnd={e => cardTouchEnd(e, cardIndex)} onDragStart={(e: any) => cardDragStart(e, cardIndex)} style={{transform: `translate(${cardsSelected[cardIndex].x}px, ${cardsSelected[cardIndex].y}px)`}}>{cardsSelected[cardIndex].text}</button>
                      )}
                    </div>
                    { <div className="available-cards" onDrop={cardRemove} onDragOver={e => e.preventDefault()} onDragEnter={e => e.preventDefault()}>
                      {currentChair.cards.map((card: Card, cardIndex: number) => 
                        cardsSelected[cardIndex] ? <></> : <button className="card" draggable="true" onTouchStart={cardTouchStart} onTouchMove={cardTouchMove} onTouchEnd={e => cardTouchEnd(e, cardIndex)} onDragStart={(e: any) => cardDragStart(e, cardIndex)}>{card.text}</button>
                      )}
                    </div>}
                    <button onClick={submit}>Submit</button>
                  </>}
                  {gameState.currentTurn !== currentPlayerOffset && currentChair.submitted && <>
                    Waiting on {gameState.chairs.filter((chair: Chair, chairIndex: number) => gameState.currentTurn !== chairIndex && !chair.submitted).length} other players
                  </>}
                </>}
                {gameState.phase === PHASE_SELECTING && <>
                  {gameState.currentTurn === currentPlayerOffset && <>
                    Your turn to select
                  </>}
                  {gameState.currentTurn !== currentPlayerOffset && <>
                    Waiting on {gameState.chairs[gameState.currentTurn].username} to select a card
                  </>}
                  {gameState.chairs.map((chair: Chair, chairIndex: number) => 
                    chairIndex === gameState.currentTurn ? <></> : <a href="#" className="note-space" onClick={(e) => {e.preventDefault(); select(chairIndex)}}>
                      {chair.cardsSubmitted?.map((card: Card) => 
                        <button className="card placed-card" style={{transform: `translate(${card.x}px, ${card.y}px)`}}>{card.text}</button>
                      )}
                    </a>
                  )}
                </>}
              </div>
            </div>

            <div className="canvas-footer">
              {gameState.prompt}
            </div>
          </div>
        }
      </div>

      {socketState.initialized && socket && !socket.connected && (
        <div id="connection-error">
          Error: Lost connection to the game
          <button onClick={connectSocket}>Reconnect</button>
          <button onClick={leave}>Leave Game</button>
        </div>
      )}

      <svg id="svg-templates">
        <g id="card-circle-outer">
            <circle r="5" cx="5" cy="5"></circle>
          </g>
        <g id="card-circle-inner">
            <circle r="4" cx="5" cy="5"></circle>
          </g>
        <g id="bad">
            <path stroke="red" d="M3,7 L7,3 M3,3 L7,7" />
          </g>
          <g id="good">
            <path fill="transparent" stroke="green" d="M3,5 L4.5,7 L7,3" />
          </g>
      </svg>
    </div>
  );
}
