import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-6 bg-white border rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-4">React in WebContainer</h1>
        <p className="text-gray-500 mb-4">
          This is a simple React app running in a WebContainer
        </p>

        <div className="flex flex-col gap-4">
          <p className="text-center text-2xl font-bold">{count}</p>
          <div className="flex gap-4">
            <button
              onClick={() => setCount(count - 1)}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Decrement
            </button>
            <button
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Increment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
