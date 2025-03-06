import { NextRequest, NextResponse } from "next/server";
import { getDocumentsById } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
  }

  try {
    const documents = await getDocumentsById({ id });

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the latest version of the document
    const latestDocument = documents.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Create an HTML page with the React component content
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    #root {
      height: 100vh;
      width: 100vw;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${latestDocument.content}
    
    // Try to find the exported component
    const componentNames = Object.keys(window).filter(key => 
      typeof window[key] === 'function' && 
      /^[A-Z]/.test(key) && 
      key !== 'React' && 
      key !== 'ReactDOM'
    );
    
    // Use the first component found, or App or default export if available
    const MainComponent = 
      window.App || 
      window.default || 
      (componentNames.length > 0 ? window[componentNames[0]] : null);
    
    if (MainComponent) {
      ReactDOM.render(
        <React.StrictMode>
          <MainComponent />
        </React.StrictMode>,
        document.getElementById('root')
      );
    } else {
      document.getElementById('root').innerHTML = 'No React component found to render.';
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error fetching React preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}
