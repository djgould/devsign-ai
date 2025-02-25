import { useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>React in WebContainer</CardTitle>
          <CardDescription>
            This is a simple React app running in a WebContainer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-center text-2xl font-bold">{count}</p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={count.toString()}
                onChange={(e) => setCount(Number(e.target.value))}
                className="text-center"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setCount(count - 1)}>
            Decrement
          </Button>
          <Button onClick={() => setCount(count + 1)}>Increment</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
