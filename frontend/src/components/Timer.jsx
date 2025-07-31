import { useEffect } from "react";

function Timer({ time, isRunning, onTimeUpdate }) {
  useEffect(() => {
    let interval = null;

    if (isRunning) {
      interval = setInterval(() => {
        onTimeUpdate((prevTime) => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, onTimeUpdate]);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  const getTimerColor = () => {
    if (time <= 90) return "text-green-600"; // Vert jusqu'à 1m30
    if (time <= 120) return "text-orange-500"; // Orange jusqu'à 2min
    return "text-red-600"; // Rouge après 2min
  };

  return (
    <div className="text-center">
      <div className={`text-6xl font-bold font-mono mb-4 ${getTimerColor()}`}>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${
            time <= 90
              ? "bg-green-500"
              : time <= 120
              ? "bg-orange-500"
              : "bg-red-500"
          }`}
          style={{ width: `${Math.min((time / 120) * 100, 100)}%` }}
        ></div>
      </div>

      {/* Indicateurs */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>0:00</span>
        <span>1:30</span>
        <span>2:00</span>
      </div>

      <div className="text-sm text-gray-600">
        {time <= 90
          ? "✅ Dans les temps"
          : time <= 120
          ? "⚠️ Attention"
          : "🚨 Dépassement"}
      </div>
    </div>
  );
}

export default Timer;
