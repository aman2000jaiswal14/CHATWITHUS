# WCA Secure Chat - React / TSX Integration Guide

This guide details how to integrate the compiled WCA Secure Chat widget (`ChatWithUsWid.js`) natively into a React (or Next.js) application using TypeScript.

## 1. Copy Assets
1. Copy the compiled `ChatWithUsWid.js` into your React project's `public/` folder.
2. Copy the `CWULicense.txt` into your project (e.g., `public/` or as a module asset).

## 2. Parsing the License (TypeScript)
The WCA Secure Chat widget expects a parsed JSON object of the RSA signed license. Here is a TypeScript utility to fetch and parse the raw `CWULicense.txt`.

Create a file named `parseCWULicense.ts`:

```typescript
export interface CWULicenseInfo {
  SIGNATURE?: string;
  [key: string]: string | undefined;
}

/**
 * Fetches and parses the raw CWULicense.txt file securely.
 */
export const fetchAndParseLicense = async (licenseUrl: string): Promise<CWULicenseInfo | null> => {
  try {
    const response = await fetch(licenseUrl);
    if (!response.ok) throw new Error("Failed to fetch license file");
    
    const text = await response.text();
    const lines = text.split('\n');
    
    const parsedData: CWULicenseInfo = {};
    let signatureB64: string | null = null;
    let inHeader = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      if (line === "--- CHAT WITH US LICENSE ---") {
        inHeader = true;
        continue;
      }
      
      if (line === "--- END ---") break;

      if (inHeader) {
        if (line.startsWith("SIGNATURE: ")) {
          signatureB64 = line.replace("SIGNATURE: ", "");
        } else if (line.includes(": ")) {
          const [key, val] = line.split(": ");
          parsedData[key] = val;
        }
      }
    }

    if (signatureB64 && Object.keys(parsedData).length > 0) {
      parsedData.SIGNATURE = signatureB64;
      return parsedData;
    }

    return null;
  } catch (error) {
    console.error("[!] React license parse error:", error);
    return null;
  }
};
```

## 3. The Integration Component

Create a wrapper component `SecureChatWidget.tsx` that fetches the license, sets the global configuration object, and dynamically mounts the script and anchor element.

```tsx
import React, { useEffect, useState } from 'react';
import { fetchAndParseLicense, CWULicenseInfo } from './parseCWULicense';

// Declare the global window type extension
declare global {
  interface Window {
    CHAT_CONFIG: {
      USER_ID: string;
      API_BASE_URL: string;
      WS_URL: string;
      LICENSE_INFO: CWULicenseInfo;
    };
  }
}

interface SecureChatProps {
  userId: string;
  apiBaseUrl: string; // e.g., "https://localhost:8000"
  wsUrl: string;      // e.g., "wss://localhost:8000/ws/chat/..."
  licensePath: string; // e.g., "/CWULicense.txt"
  widgetScriptPath: string; // e.g., "/ChatWithUsWid.js"
}

export const SecureChatWidget: React.FC<SecureChatProps> = ({
  userId,
  apiBaseUrl,
  wsUrl,
  licensePath,
  widgetScriptPath
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Fetch and Parse License
    fetchAndParseLicense(licensePath).then((licenseInfo) => {
      if (!licenseInfo) {
        console.error("Failed to load WCA Secure Chat license.");
        return;
      }

      // 2. Set the Global Configuration Layer
      window.CHAT_CONFIG = {
        USER_ID: userId,
        API_BASE_URL: apiBaseUrl,
        WS_URL: wsUrl,
        LICENSE_INFO: licenseInfo,
      };

      // 3. Mark as Ready config injected
      setIsReady(true);
    });
  }, [userId, apiBaseUrl, wsUrl, licensePath]);

  useEffect(() => {
    if (isReady) {
      // 4. Inject the Widget Script Dynamically
      const script = document.createElement('script');
      script.src = widgetScriptPath;
      script.type = 'module';
      // Append a random query to bust cache if needed: `?v=${Date.now()}`
      document.body.appendChild(script);

      return () => {
        // Cleanup if component unmounts
        document.body.removeChild(script);
      };
    }
  }, [isReady, widgetScriptPath]);

  // 5. Render the Anchor Div
  // The widget script will look for <div id="root"> or create it automatically.
  // We provide a dedicated anchor block here for clarity.
  return <div id="root" className="wca-chat-anchor"></div>;
};

export default SecureChatWidget;
```

## 4. Usage in your App

```tsx
import React from 'react';
import SecureChatWidget from './SecureChatWidget';

const App = () => {
  return (
    <div>
      <h1>My Host Dashboard</h1>
      
      {/* 
        Inject the Widget. 
        Note: The actual chat UI renders inside a floating ShadowDOM 
        anchored to the bottom right of the screen.
      */}
      <SecureChatWidget 
        userId="user1"
        apiBaseUrl="https://localhost:8000"
        wsUrl="wss://localhost:8000/ws/chat/user1/"
        licensePath="/CWULicense.txt"
        widgetScriptPath="/ChatWithUsWid.js"
      />
    </div>
  );
};

export default App;
```
