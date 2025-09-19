import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Direction, Coords } from './types';
import {
  BOARD_SIZE,
  INITIAL_SNAKE_POSITION,
  INITIAL_FOOD_POSITION,
  INITIAL_SPEED_MS,
  MIN_SPEED_MS,
  SPEED_INCREMENT,
} from './constants';

const App: React.FC = () => {
  const [snake, setSnake] = useState<Coords[]>(INITIAL_SNAKE_POSITION);
  const [food, setFood] = useState<Coords>(INITIAL_FOOD_POSITION);
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED_MS);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [scorePulse, setScorePulse] = useState<boolean>(false);
  const [isCrashing, setIsCrashing] = useState<boolean>(false);
  const [isDissolving, setIsDissolving] = useState<boolean>(false);
  const [scoreMultiplier, setScoreMultiplier] = useState<number>(1);
  const [consecutiveFood, setConsecutiveFood] = useState<number>(0);
  const [multiplierPulse, setMultiplierPulse] = useState<boolean>(false);
  
  const gameLoopTimeout = useRef<number | null>(null);
  const directionBuffer = useRef<Direction[]>([]);

  const generateFoodPosition = useCallback((): Coords => {
    while (true) {
      const newFood = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE),
      };
      if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        return newFood;
      }
    }
  }, [snake]);

  const resetGame = useCallback(() => {
    directionBuffer.current = [];
    setSnake(INITIAL_SNAKE_POSITION);
    setFood(INITIAL_FOOD_POSITION);
    setDirection(Direction.RIGHT);
    setSpeed(INITIAL_SPEED_MS);
    setIsGameOver(false);
    setIsRunning(false);
    setHasStarted(false);
    setScore(0);
    setIsCrashing(false);
    setIsDissolving(false);
    setScoreMultiplier(1);
    setConsecutiveFood(0);
  }, []);

  const handleGameOver = useCallback(() => {
    directionBuffer.current = [];
    setIsCrashing(true);
    setIsRunning(false);
    setIsDissolving(true);
    setTimeout(() => setIsCrashing(false), 400);
  }, []);

  const handleStart = useCallback(() => {
      setIsRunning(true);
      setHasStarted(true);
  }, []);
  
  const handleDirectionChange = (newDirection: Direction) => {
    if (!hasStarted) {
      handleStart();
    }
    if (directionBuffer.current.length < 2) {
      directionBuffer.current.push(newDirection);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    
    switch (e.key) {
      case 'ArrowUp':
        handleDirectionChange(Direction.UP);
        break;
      case 'ArrowDown':
        handleDirectionChange(Direction.DOWN);
        break;
      case 'ArrowLeft':
        handleDirectionChange(Direction.LEFT);
        break;
      case 'ArrowRight':
        handleDirectionChange(Direction.RIGHT);
        break;
      case ' ': // Space bar to pause/resume
        if (hasStarted && !isGameOver && !isDissolving) {
            setIsRunning(prev => !prev);
        }
        break;
    }
  }, [hasStarted, isGameOver, isDissolving]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  useEffect(() => {
    if (!isDissolving) return;

    const initialSnakeLength = snake.length;
    if (initialSnakeLength === 0) {
      setIsGameOver(true);
      setIsDissolving(false);
      return;
    }

    const DISSOLVE_DURATION_MS = 800;
    const intervalTime = Math.max(20, DISSOLVE_DURATION_MS / initialSnakeLength);

    const intervalId = setInterval(() => {
      setSnake(prevSnake => {
        if (prevSnake.length <= 1) {
          clearInterval(intervalId);
          return [];
        }
        return prevSnake.slice(0, -1);
      });
    }, intervalTime);
    
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setIsGameOver(true);
      setIsDissolving(false);
    }, DISSOLVE_DURATION_MS + 100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isDissolving, snake.length]);

  const gameLoop = useCallback(() => {
    if (!isRunning || isGameOver || isDissolving) return;

    let newDirectionForTick = direction;
    const isOpposite = (dir1: Direction, dir2: Direction) => (
      (dir1 === Direction.UP && dir2 === Direction.DOWN) ||
      (dir1 === Direction.DOWN && dir2 === Direction.UP) ||
      (dir1 === Direction.LEFT && dir2 === Direction.RIGHT) ||
      (dir1 === Direction.RIGHT && dir2 === Direction.LEFT)
    );

    while (directionBuffer.current.length > 0) {
        const nextDirection = directionBuffer.current[0];
        if (!isOpposite(newDirectionForTick, nextDirection)) {
            newDirectionForTick = directionBuffer.current.shift()!;
            break; 
        } else {
            directionBuffer.current.shift();
        }
    }

    if (newDirectionForTick !== direction) {
      setDirection(newDirectionForTick);
    }

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (newDirectionForTick) {
        case Direction.UP: head.y -= 1; break;
        case Direction.DOWN: head.y += 1; break;
        case Direction.LEFT: head.x -= 1; break;
        case Direction.RIGHT: head.x += 1; break;
      }

      if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
        handleGameOver();
        return prevSnake;
      }

      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          handleGameOver();
          return prevSnake;
        }
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        const points = 10 * scoreMultiplier;
        setScore(prevScore => prevScore + points);
        setScorePulse(true);
        setTimeout(() => setScorePulse(false), 300);
        
        const newConsecutiveFood = consecutiveFood + 1;
        setConsecutiveFood(newConsecutiveFood);
        
        const newMultiplier = 1 + Math.floor(newConsecutiveFood / 3);
        if (newMultiplier > scoreMultiplier) {
            setScoreMultiplier(newMultiplier);
            setMultiplierPulse(true);
            setTimeout(() => setMultiplierPulse(false), 300);
        }

        setFood(generateFoodPosition());
        setSpeed(prevSpeed => Math.max(MIN_SPEED_MS, prevSpeed - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [isRunning, isGameOver, isDissolving, direction, food, generateFoodPosition, scoreMultiplier, consecutiveFood, handleGameOver]);
  
  useEffect(() => {
    if (gameLoopTimeout.current) {
        clearTimeout(gameLoopTimeout.current);
    }
    if (isRunning && !isGameOver) {
        gameLoopTimeout.current = setTimeout(gameLoop, speed);
    }
    return () => {
        if (gameLoopTimeout.current) {
            clearTimeout(gameLoopTimeout.current);
        }
    };
  }, [snake, isRunning, isGameOver, speed, gameLoop]);


  const renderBoard = () => {
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isSnake = snake.some(segment => segment.x === x && segment.y === y);
        const isSnakeHead = snake.length > 0 && snake[0].x === x && snake[0].y === y;
        const isFood = food.x === x && food.y === y;
        
        const cellBg = (x + y) % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700';

        let content = null;
        if (isSnakeHead) {
            let eyeContainerClasses = 'absolute w-1/2 h-1/2 flex items-center justify-around ';
            let eyeClasses = 'w-1/4 h-1/4 bg-black rounded-full';
            switch (direction) {
                case Direction.UP: eyeContainerClasses += 'top-[15%] left-1/4 flex-row'; break;
                case Direction.DOWN: eyeContainerClasses += 'bottom-[15%] left-1/4 flex-row'; break;
                case Direction.LEFT: eyeContainerClasses += 'left-[15%] top-1/4 flex-col'; break;
                case Direction.RIGHT: eyeContainerClasses += 'right-[15%] top-1/4 flex-col'; break;
            }
            content = (
                <div className="w-full h-full bg-green-400 rounded-md relative overflow-hidden">
                    <div className={eyeContainerClasses}>
                        <div className={eyeClasses}></div>
                        <div className={eyeClasses}></div>
                    </div>
                </div>
            );
        } else if (isSnake) {
            content = <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-md"></div>;
        } else if (isFood) {
            content = (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="relative w-3/4 h-3/4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50">
                        <div className="absolute top-1 left-1 w-1/4 h-1/4 bg-white/50 rounded-full"></div>
                    </div>
                </div>
            );
        }

        cells.push(
          <div key={`${x}-${y}`} className={`w-full h-full ${cellBg}`}>
            {content}
          </div>
        );
      }
    }
    return cells;
  };
  
  const dPadButtonClasses = "w-full aspect-square bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg text-3xl flex items-center justify-center transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-mono">
      <h1 className="text-4xl font-bold mb-4 tracking-wider">REACT SNAKE</h1>
      
      <div className="w-full max-w-lg flex justify-between items-center mb-4 px-4 py-2 bg-gray-800 rounded-lg">
        <div className="text-2xl font-semibold">
          Score: <span className={`text-green-400 inline-block transition-transform duration-300 ${scorePulse ? 'scale-150' : 'scale-100'}`}>{score}</span>
          {scoreMultiplier > 1 && (
            <span className={`ml-2 text-yellow-400 transition-transform duration-300 inline-block ${multiplierPulse ? 'scale-150' : 'scale-100'}`}>
              (x{scoreMultiplier})
            </span>
          )}
        </div>
        <button
          onClick={() => setIsRunning(!isRunning)}
          disabled={!hasStarted || isGameOver || isDissolving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div className={`relative w-full max-w-lg aspect-square bg-gray-700 border-4 rounded-lg shadow-2xl transition-all duration-300 ${isCrashing ? 'border-red-500 shadow-red-500/50' : 'border-gray-600'}`}>
        <div className="grid w-full h-full" style={{gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`}}>
          {renderBoard()}
        </div>

        {!isDissolving && (isGameOver || !hasStarted) && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center rounded-md text-center p-4">
            {isGameOver ? (
              <>
                <h2 className="text-5xl font-extrabold text-red-500 mb-2">GAME OVER</h2>
                <p className="text-2xl mb-6">Final Score: {score}</p>
                <button
                  onClick={resetGame}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold transition-transform transform hover:scale-105"
                >
                  Play Again
                </button>
              </>
            ) : (
                 <>
                    <h2 className="text-5xl font-extrabold text-green-400 mb-4">Ready?</h2>
                     <button
                        onClick={handleStart}
                        className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold transition-transform transform hover:scale-105"
                    >
                        Start Game
                    </button>
                    <div className="mt-8 text-gray-400 text-base">
                        <p>Use <kbd className="font-sans border rounded px-1.5 py-0.5 border-gray-600">Arrow Keys</kbd> to Move</p>
                        <p className="mt-2">Use <kbd className="font-sans border rounded px-1.5 py-0.5 border-gray-600">Spacebar</kbd> to Pause/Resume</p>
                    </div>
                </>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 w-full max-w-xs sm:hidden">
        <div className="grid grid-cols-3 grid-rows-2 gap-3">
          <button
            onClick={() => handleDirectionChange(Direction.UP)}
            disabled={isGameOver || isDissolving}
            className={`${dPadButtonClasses} col-start-2 row-start-1`}
            aria-label="Up"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => handleDirectionChange(Direction.LEFT)}
            disabled={isGameOver || isDissolving}
            className={`${dPadButtonClasses} col-start-1 row-start-2`}
            aria-label="Left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleDirectionChange(Direction.DOWN)}
            disabled={isGameOver || isDissolving}
            className={`${dPadButtonClasses} col-start-2 row-start-2`}
            aria-label="Down"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleDirectionChange(Direction.RIGHT)}
            disabled={isGameOver || isDissolving}
            className={`${dPadButtonClasses} col-start-3 row-start-2`}
            aria-label="Right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
