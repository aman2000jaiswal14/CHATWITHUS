# WCA Secure Chat - React + Java Backend Integration Guide

This guide details how to integrate the compiled WCA Secure Chat widget (`ChatWithUsWid.js`) into a 3rd-party application that uses a **React Frontend** and a **Java Backend (Spring Boot)**, including detailed file placement and licensing mechanics.

---

## 1. Directory & File Placement

To keep the application secure and robust, distribute the integration assets as follows:

| Asset File | Target Location | Description |
| :--- | :--- | :--- |
| **`ChatWithUsWid.js`** | **React Frontend Asset Directory** (`public/chat/` or CDN) | The compiled React frontend widget bundle containing the shadow-root mounting logic. |
| **`CWULicense.txt`** | **Java Backend Server Classpath** (`src/main/resources/`) | The raw cryptographic license file. The backend reads and parses it to supply validation fields to the client. |
| **`host_private_key.pem`** | **Java Backend Server** (`src/main/resources/keys/` or `/etc/wca/keys/`) | 2048-bit RSA Private Key used by Spring Boot to sign single-use `RS256` identity tokens. **Must never leave Java backend.** |
| **`host_public_key.pem`** | **Django Chat Server** (`Main Application/keys/host_public_key.pem`) | Corresponding 2048-bit RSA Public Key used by Django to verify incoming identity assertions. |

---

## 2. Licensing & Identity Architecture Flow

The system operates on an **Asymmetric RSA (RS256)** Zero-Trust model. The Java backend signs identity assertions with its private key; the Django chat server verifies them with the public key. No shared secrets are ever shared between the servers.

```mermaid
sequenceDiagram
    participant React as React Frontend
    participant Java as Java Backend (Spring Boot)
    participant Django as Django Chat Server

    Note over Java: Loads host_private_key.pem & CWULicense.txt
    
    React->>Java: 1. GET /api/chat/config (Authenticated Session)
    Java->>Java: 2. Signs RS256 Identity Token (sub: username, exp: +300s, jti: UUID)
    Java->>Java: 3. Parses raw license text into JSON properties
    Java-->>React: 4. Returns { username, identityToken, apiBaseUrl, wsUrl, licenseInfo }
    
    Note over React: Injects config into window.CHAT_CONFIG (USER_ID, IDENTITY_TOKEN)
    Note over React: Loads ChatWithUsWid.js into Shadow DOM
    
    React->>Django: 5. POST /chat/api/acall/bas { identity_token }
    Note over Django: 6. Verifies RS256 with host_public_key.pem<br/>Checks leeway (60s) & anti-replay nonce (jti)
    Django-->>React: 7. Issues Chat Session JWT
    
    React->>Django: 8. Connect WebSocket (ws://.../?token=JWT)
```

### How Verification and Assertion Happen
1. **Java Host Token Assertion**:
   - Spring Boot generates a short-lived (5-minute) JWT signed with `host_private_key.pem` (RS256).
   - Payload includes:
     - `sub`: Authenticated username.
     - `iss`: Host identifier (e.g. `java-host`).
     - `aud`: `"chatwithus"`.
     - `iat`: Epoch timestamp.
     - `exp`: `now + 300` seconds (5 minutes for resilient high-latency / 1 Mbps links).
     - `jti`: Unique random UUID nonce to prevent replay attacks.
2. **Chat Server Cryptographic Verification**:
   - Django receives the `identity_token` at `/chat/api/acall/bas`.
   - Django validates the signature using `host_public_key.pem`.
   - Django enforces `aud="chatwithus"`, allows up to 60 seconds clock drift leeway, and verifies the `jti` has not been reused (cached for 10 minutes).
   - Upon successful verification, Django returns the internal chat session JWT (`{ "token": "<jwt>" }`).

3. **Transparent 15-Minute Token Renewal**:
   - The Chat Server access token expires every 15 minutes to strictly cap the exposure window of bearer tokens.
   - When expired, the Chat Widget invokes `getFreshIdentityToken()` (or dispatches `cwu:token-expired`).
   - React calls Java `/api/chat/config` with the active `userSessionToken`, retrieves a fresh `identityToken`, and returns it.
   - The widget exchanges it for a new 15-minute token with zero UI interruption.
   - If the user logged out of the Java Host, Java returns `401/403`, stopping the chat instantly. Zero long-lived refresh tokens exist in browser memory.

---

## 3. Java Backend Implementation (Spring Boot)

### A. Maven Dependencies (`pom.xml`)
Add the standard **JJWT** (Java JWT) libraries to your `pom.xml` for RS256 cryptographic signing:

```xml
<!-- JJWT for RS256 Token Signing -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

---

### B. RSA Identity Token Service
Create `ChatIdentityTokenService.java` to load the private PEM key and generate signed RS256 assertions:

```java
package com.example.chat.security;

import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Service
public class ChatIdentityTokenService {

    private final PrivateKey privateKey;

    public ChatIdentityTokenService(@Value("${chat.host-private-key-path:classpath:keys/host_private_key.pem}") Resource keyResource) throws Exception {
        this.privateKey = loadPrivateKey(keyResource);
    }

    private PrivateKey loadPrivateKey(Resource keyResource) throws Exception {
        try (InputStream is = keyResource.getInputStream()) {
            String keyContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            // Strip PEM headers and whitespace
            String cleanKey = keyContent
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                    .replace("-----END RSA PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");

            byte[] decoded = Base64.getDecoder().decode(cleanKey);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        }
    }

    /**
     * Generates a 5-minute RS256 identity assertion token for the chat server.
     */
    public String generateIdentityToken(String username) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(300); // 5 minutes validity

        return Jwts.builder()
                .subject(username)
                .issuer("java-host")
                .audience().add("chatwithus").and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .id(UUID.randomUUID().toString()) // Anti-replay JTI nonce
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }
}
```

---

### C. License Parser Utility
Create `ChatLicenseParser.java` to parse the raw license text:

```java
package com.example.chat.licensing;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class ChatLicenseParser {

    public static Map<String, String> parseLicense(InputStream licenseStream) throws Exception {
        Map<String, String> parsedData = new HashMap<>();
        String signature = null;
        boolean inLicenseBlock = false;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(licenseStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                
                if (line.equals("--- CHAT WITH US LICENSE ---")) {
                    inLicenseBlock = true;
                    continue;
                }
                
                if (line.equals("--- END ---")) {
                    break;
                }

                if (inLicenseBlock) {
                    if (line.startsWith("SIGNATURE: ")) {
                        signature = line.replace("SIGNATURE: ", "");
                    } else if (line.contains(": ")) {
                        String[] parts = line.split(": ", 2);
                        parsedData.put(parts[0], parts[1]);
                    }
                }
            }
        }

        if (signature != null) {
            parsedData.put("SIGNATURE", signature);
        }
        return parsedData;
    }
}
```

---

### D. Controller for Configuration & Identity Token
Implement the REST endpoint returning the **`identityToken`** and license info:

```java
package com.example.chat.controller;

import com.example.chat.licensing.ChatLicenseParser;
import com.example.chat.security.ChatIdentityTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatConfigController {

    private final ChatIdentityTokenService tokenService;
    private final ResourceLoader resourceLoader;

    @Value("${chat.server.api-url}")
    private String apiBaseUrl;

    @Value("${chat.server.ws-url}")
    private String wsBaseUrl;

    public ChatConfigController(ChatIdentityTokenService tokenService, ResourceLoader resourceLoader) {
        this.tokenService = tokenService;
        this.resourceLoader = resourceLoader;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getChatConfig(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String username = userDetails.getUsername();

            // 1. Generate RS256 Identity Token signed by Host Private Key
            String identityToken = tokenService.generateIdentityToken(username);

            // 2. Load and parse CWULicense.txt from classpath resources
            Resource licenseResource = resourceLoader.getResource("classpath:CWULicense.txt");
            Map<String, String> licenseInfo = ChatLicenseParser.parseLicense(
                licenseResource.getInputStream()
            );

            // 3. Assemble response payload
            Map<String, Object> response = new HashMap<>();
            response.put("username", username);
            response.put("identityToken", identityToken);
            response.put("apiBaseUrl", apiBaseUrl);
            response.put("wsUrl", wsBaseUrl + "/chat/ws/chat/" + username + "/");
            response.put("licenseInfo", licenseInfo);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
```

---

## 4. React Frontend Integration

Create an integration component `ChatWidget.jsx` in your React project:

```jsx
import React, { useEffect, useState } from 'react';

const ChatWidget = ({ userSessionToken }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 1. Helper to retrieve a fresh RS256 identity token from Java backend
    const fetchFreshIdentityToken = async () => {
      const res = await fetch('/api/chat/config', {
        headers: {
          'Authorization': `Bearer ${userSessionToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Could not load chat configuration');
      const data = await res.json();
      return data.identityToken;
    };

    // 2. Initial configuration retrieval from Java Backend
    fetch('/api/chat/config', {
      headers: {
        'Authorization': `Bearer ${userSessionToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Could not load chat configuration');
        return res.json();
      })
      .then(data => {
        // 3. Inject parameters with renewal callback into window.CHAT_CONFIG
        window.CHAT_CONFIG = {
          USER_ID: data.username,
          IDENTITY_TOKEN: data.identityToken, // Initial RS256 Identity Assertion
          CONFIG_URL: '/api/chat/config',
          API_BASE_URL: data.apiBaseUrl,
          WS_URL: data.wsUrl,
          LICENSE_INFO: data.licenseInfo,
          // Callback invoked by Chat Widget whenever its 15-minute token expires
          getFreshIdentityToken: fetchFreshIdentityToken
        };

        // 4. Dynamically inject the Chat Widget script
        const scriptId = 'chat-widget-loader';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = '/chat/ChatWithUsWid.js'; // Served from public/chat/ directory
          script.type = 'module';
          script.async = true;
          document.body.appendChild(script);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Chat Widget mount failed:', err);
        setError(true);
      });

    // 5. Event Bridge: Also listen for widget token expiry events
    const handleTokenExpired = async () => {
      try {
        const freshToken = await fetchFreshIdentityToken();
        window.dispatchEvent(new CustomEvent('cwu:token-renewed', {
          detail: { identityToken: freshToken }
        }));
      } catch (e) {
        console.error('[ChatWidget] Failed to renew identity token:', e);
      }
    };
    window.addEventListener('cwu:token-expired', handleTokenExpired);
    return () => window.removeEventListener('cwu:token-expired', handleTokenExpired);
  }, [userSessionToken]);

  if (error) return <div style={{ color: '#ef4444' }}>Chat connection error</div>;
  return null; // Mounts floating shadow root directly to document body
};

export default ChatWidget;
```

---

## 5. Security Summary Checklist

* **Asymmetric Zero-Trust (RS256)**: The Java Host holds the private key (`host_private_key.pem`); the Chat Server holds only the public key (`host_public_key.pem`). No shared secret or server key is ever exposed.
* **Anti-Replay Protection**: Every identity token contains a unique `jti` UUID nonce. The Django Chat Server records nonces in Redis/cache for 10 minutes and rejects duplicate submissions.
* **Network Latency & Clock Drift Resilience**:
  - Tokens have a **5-minute (`exp: now + 300`)** lifespan, ensuring smooth handshake over slow 1 Mbps or satellite links.
  - Verification includes **60 seconds leeway** to gracefully accommodate server clock skew in air-gapped environments.
* **Cryptographic Tamper Prevention**: If any entity tampers with `licenseInfo` or permissions in the frontend, the widget's internal Web Crypto signature validation aborts initialization immediately.

---

## 6. License Hot Reloading

When the license file (`CWULicense.txt`) is updated, you can configure the system to hot-reload and pick up the new license details instantly without restarting the servers:

### A. Django Chat Server
The central chat server has **no cache** in its verification pipeline. Every request to `LicensingService.get_license_info()` opens and reads the raw file from disk dynamically. Therefore, any update to the license file on the Django machine is immediately reflected on all new WebSocket and API requests without a server restart.

### B. Java Backend (Spring Boot Host)
* **Using Classpath Resources (`classpath:CWULicense.txt`)**: 
  Resources stored inside a compiled Spring Boot JAR are zipped and immutable at runtime. A change to a classpath resource requires rebuilding/redeploying the JAR.
* **Using External Filesystem Storage (Recommended for Hot Reloading)**:
  To allow hot-reloading on the Java host, load the license from a configurable file system path:
  
  ```java
  // In ChatConfigController.java:
  // Instead of classpath:CWULicense.txt, use file: pointing to a local file system path
  Resource licenseResource = resourceLoader.getResource("file:/etc/wca/CWULicense.txt");
  ```
  Since the controller opens and parses the file stream on every `/api/chat/config` request, any update to `/etc/wca/CWULicense.txt` on the server disk will take effect **instantly** on the next request.

### C. React Frontend
The React client fetches the license information on page mount. 
* To apply a changed license to the frontend client, the user needs to **refresh the page** (or re-mount the `ChatWidget` component), which triggers a new `/api/chat/config` fetch call. No rebuild of the frontend application is required.

---

## 7. Configuring Token Expiry & Clock Drift Leeway (Lagger)

If your organization's security policy requires shortening the host-issued identity token lifespan (e.g. from **5 minutes down to 30 seconds**) and reducing the clock drift leeway ("lagger") to **30 seconds**:

### A. Java Host Backend (Spring Boot)
The identity assertion token is generated and signed with `host_private_key.pem` inside `ChatTokenService.java`.
* **File**: `ChatTokenService.java` (described in Section 3.B)
* **Method**: `generateIdentityToken(String username)`
* **Line**: ~153
* **Edit**:
  ```java
  // BEFORE (5 minutes / 300 seconds):
  Instant expiry = now.plusSeconds(300); // 5 minutes validity

  // AFTER (30 seconds):
  Instant expiry = now.plusSeconds(30);  // 30 seconds validity
  ```

### B. React Frontend Host Application (`ChatWidget.jsx`)
* **Changes Required**: **None!**
* **Why**: The React component does not hardcode any token durations. It delegates all token acquisition to the `fetchFreshIdentityToken()` callback via Java's `/api/chat/config`. When the Chat Widget detects an expired token or connects, it triggers `getFreshIdentityToken()` automatically, which fetches the new 30-second token from Java seamlessly.

### C. Django Chat Server (Public Key Verification & Clock Drift Leeway)
The Chat Server verifies the RS256 token using `host_public_key.pem` and enforces clock drift leeway.
* **File**: `Main Application/chat/services/auth.py`
* **Function**: `verify_host_identity_token(identity_token)`
* **Line**: ~59
* **Edit**:
  ```python
  # BEFORE (60 seconds clock drift leeway / lagger):
  payload = jwt.decode(
      identity_token,
      HOST_PUBLIC_KEY,
      algorithms=["RS256"],
      audience="chatwithus",
      leeway=60  # 60s clock drift tolerance
  )

  # AFTER (30 seconds clock drift leeway / lagger):
  payload = jwt.decode(
      identity_token,
      HOST_PUBLIC_KEY,
      algorithms=["RS256"],
      audience="chatwithus",
      leeway=30  # 30s clock drift tolerance
  )
  ```
* **Anti-Replay Nonce Cache TTL**: In the same file (`auth.py`, line ~74), since total token validity window is now 30s expiry + 30s leeway = 60s, you can safely reduce the nonce cache timeout from 600s down to 120s:
  ```python
  cache.set(nonce_cache_key, 1, timeout=120)
  ```


