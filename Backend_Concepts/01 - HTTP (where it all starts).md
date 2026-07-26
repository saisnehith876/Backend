# Understanding HTTP for Backend Engineers

Where it all starts. A reference guide covering HTTP fundamentals, message anatomy, methods, status codes, CORS, caching, content negotiation, large data transfer, and security.

---

## Table of Contents

1. [Core Principles of HTTP](#1-core-principles-of-http)
2. [Transport Protocol & HTTP Versions](#2-transport-protocol--http-versions)
3. [Anatomy of HTTP Messages](#3-anatomy-of-http-messages)
4. [HTTP Headers](#4-http-headers)
5. [HTTP Methods and Idempotency](#5-http-methods-and-idempotency)
6. [Cross-Origin Resource Sharing (CORS)](#6-cross-origin-resource-sharing-cors)
7. [Standardized Status Codes](#7-standardized-status-codes)
8. [HTTP Caching](#8-http-caching)
9. [Content Negotiation and Compression](#9-content-negotiation-and-compression)
10. [Handling Large Data Transfers](#10-handling-large-data-transfers)
11. [Security (SSL/TLS & HTTPS)](#11-security-ssltls--https)
12. [Quick Reference Cheatsheet](#12-quick-reference-cheatsheet)
13. [Debugging Guide — Mapping Symptoms to Causes](#13-debugging-guide--mapping-symptoms-to-causes)

---

## 1. Core Principles of HTTP

HTTP (Hypertext Transfer Protocol) is an **application-layer protocol** (Layer 7 in the OSI model) used by clients and servers to communicate.

```
┌─────────────────────────────────────────────┐
│               OSI Model (simplified)          │
├─────────────────────────────────────────────┤
│  Layer 7  Application   →  HTTP lives here   │
│  Layer 4  Transport     →  TCP / UDP         │
│  Layer 3  Network       →  IP                │
└─────────────────────────────────────────────┘
```

It's built on two fundamental ideas:

- **Statelessness** — the server retains no memory of past interactions. Every request is entirely self-contained and must include all the necessary information (like authentication tokens or cookies) for the server to process it.
  - **Benefits:** simplifies server architecture and improves scalability, because a single server doesn't need to track user sessions, and a server crash won't destroy a client's state.
- **Client-Server Model** — communication is always initiated by the client (e.g. a web browser) to request resources or actions; the server waits for these requests to process and respond.

```
  CLIENT                                   SERVER
    │                                         │
    │ ── initiates request ────────────────▶ │
    │                                         │  (processes, no memory
    │ ◀──────────────── responds ──────────  │   of prior requests)
    │                                         │
```

---

## 2. Transport Protocol & HTTP Versions

HTTP relies on a reliable, connection-based transport protocol — almost universally **TCP**. Over the years, HTTP has evolved to improve how these TCP connections are handled:

| Version | Key Change |
|---|---|
| **HTTP/1.0** | Opened a new TCP connection for every single request/response — inefficient and slow. |
| **HTTP/1.1** | Introduced persistent connections (`keep-alive`) as default — multiple requests reuse one connection. |
| **HTTP/2.0** | Introduced multiplexing (concurrent requests/responses on one connection), binary framing, header compression, and server push. |
| **HTTP/3.0** | Replaced TCP with **QUIC** (built over UDP) for faster connections and better packet-loss handling, eliminating head-of-line blocking. |

```
HTTP/1.0     [conn]→req→res→[close]  [conn]→req→res→[close]  (new conn each time)
HTTP/1.1     [conn]→req→res→req→res→req→res→[close]           (persistent/keep-alive)
HTTP/2.0     [conn]→(req1,req2,req3 multiplexed)→(res1,res2,res3)
HTTP/3.0     [QUIC/UDP]→ same idea as HTTP/2, without TCP's head-of-line blocking
```

---

## 3. Anatomy of HTTP Messages

Client-server communication happens via structured text messages.

### Request Message (Client → Server)

```
POST /api/shorten HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Length: 42

{"longUrl": "https://www.example.com/some/long/path"}
```

Contains:
- **Request Method** (e.g. GET/POST)
- **Resource URL**
- **HTTP Version**
- **Host domain**
- **Headers**
- A **blank line**
- An optional **Request Body**

### Response Message (Server → Client)

```
HTTP/1.1 201 Created
Content-Type: application/json
Content-Length: 87
Date: Mon, 27 Jul 2026 09:15:32 GMT

{"shortCode": "abc1234", "longUrl": "https://www.example.com/some/long/path"}
```

Contains:
- **HTTP Version**
- **Status Code** (e.g. 200)
- **Status Value** (e.g. OK)
- **Headers**
- A **blank line**
- The **Response Body**

```
┌───────────────────────────┐        ┌───────────────────────────┐
│         REQUEST           │        │         RESPONSE          │
├───────────────────────────┤        ├───────────────────────────┤
│ Method  URL  HTTP-Version │        │ HTTP-Version  Status Code │
│ Headers...                │  ───▶  │ Headers...                │
│ (blank line)               │        │ (blank line)               │
│ Body (optional)            │        │ Body                       │
└───────────────────────────┘        └───────────────────────────┘
```

---

## 4. HTTP Headers

Headers are key-value pairs that act as **metadata** for the package being transmitted — a "remote control" that dictates server/client behavior.

| Category | Purpose | Examples |
|---|---|---|
| **Request Headers** | Give the server context | `User-Agent` (identifies the browser), `Authorization` (sends credentials) |
| **General Headers** | Apply to both requests and responses | `Date`, `Connection`, `Cache-Control` |
| **Representation Headers** | Describe the message body | `Content-Type` (JSON/HTML), `Content-Length` (byte size), `Content-Encoding` (gzip) |
| **Security Headers** | Protect against attacks | `Strict-Transport-Security` (forces HTTPS), `Content-Security-Policy` (prevents XSS), `Set-Cookie` with `HttpOnly` |

Example headers in context:

```
GET /dashboard HTTP/1.1
Host: app.example.com
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
Authorization: Bearer <token>
Accept: application/json
```

```
HTTP/1.1 200 OK
Content-Type: application/json
Strict-Transport-Security: max-age=63072000; includeSubDomains
Set-Cookie: sessionId=abc123; HttpOnly; Secure
```

---

## 5. HTTP Methods and Idempotency

Methods define the semantic intent of the client's request.

| Method | Purpose |
|---|---|
| `GET` | Fetches data without modifying anything |
| `POST` | Submits new data to the server (includes a request body) |
| `PATCH` | Partially updates an existing resource |
| `PUT` | Completely replaces an existing resource with the provided body |
| `DELETE` | Removes a resource |
| `OPTIONS` | Inquires about server capabilities (used heavily in CORS) |

### Idempotency

- **Idempotent methods** — running them multiple times yields the exact same server state: `GET`, `PUT`, `DELETE`.
- **Non-idempotent methods** — running them multiple times creates different results: `POST` (submitting twice creates two separate resources).

```
POST /api/urls   (run twice) → 2 new resources created   ❌ not idempotent
PUT  /api/urls/1 (run twice) → same final state           ✅ idempotent
DELETE /api/urls/1 (run twice) → resource gone either way ✅ idempotent
```

**Example — PUT (idempotent replace):**
```
PUT /api/urls/abc1234 HTTP/1.1
Content-Type: application/json

{"longUrl": "https://updated-destination.com"}
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{"shortCode": "abc1234", "longUrl": "https://updated-destination.com"}
```

---

## 6. Cross-Origin Resource Sharing (CORS)

Browsers enforce a **Same-Origin Policy**, blocking web apps from making requests to different domains (origins). CORS is a security mechanism to bypass this safely.

### Simple Requests

Usually `GET` or `POST` with standard headers/content types.

```
CLIENT (origin: app.com)                    SERVER (api.com)
        │                                         │
        │  GET /data   Origin: app.com  ───────▶  │
        │                                         │
        │ ◀── 200 OK                              │
        │     Access-Control-Allow-Origin: app.com│
```

- The browser automatically adds an `Origin` header.
- If the server allows the request, it replies with `Access-Control-Allow-Origin` containing the client's domain (or `*`).
- If that header is missing, the **browser blocks the response** (the request still reaches the server — the block happens client-side).

### Pre-flight Requests

Triggered if a request uses a non-simple method (`PUT`/`DELETE`), requires authorization headers, or uses `application/json`.

```
CLIENT                                          SERVER
   │                                               │
   │  OPTIONS /api/urls/1                          │
   │  Origin: app.com                              │
   │  Access-Control-Request-Method: DELETE  ────▶ │
   │                                               │
   │ ◀── 204 No Content                            │
   │     Access-Control-Allow-Origin: app.com      │
   │     Access-Control-Allow-Methods: GET,DELETE  │
   │     Access-Control-Allow-Headers: Content-Type│
   │     Access-Control-Max-Age: 86400             │
   │                                               │
   │  (preflight OK — now send the real request)   │
   │                                               │
   │  DELETE /api/urls/1  ─────────────────────▶   │
   │ ◀── 200 OK                                    │
```

1. The browser fires an `OPTIONS` request asking the server if the route supports the intended method/headers.
2. The server replies with `204 No Content`, explicitly listing allowed origins, methods, headers, and a `max-age` to cache this configuration.
3. If successful, the browser then sends the actual, original request.

---

## 7. Standardized Status Codes

Status codes are three-digit numbers that act as a universal language to indicate the outcome of a request.

### 1xx — Informational
- `100 Continue` — headers received, client can proceed (used for large uploads)

### 2xx — Success
- `200 OK` — successful operation
- `201 Created` — usually follows a POST request
- `204 No Content` — successful, but no body to return (used in OPTIONS or DELETE)

### 3xx — Redirection
- `301 Moved Permanently` — resource has a new URL
- `302 Found` / Temporary Redirect — temporarily forward to a new route
- `304 Not Modified` — tells the client to use its locally cached version

### 4xx — Client Errors
- `400 Bad Request` — invalid data format sent by client
- `401 Unauthorized` — missing or invalid authentication token
- `403 Forbidden` — authenticated, but lacks necessary permissions
- `404 Not Found` — incorrect URL or deleted resource
- `405 Method Not Allowed` — wrong method for a route
- `409 Conflict` — business logic violation (e.g. duplicate username)
- `429 Too Many Requests` — client has hit rate limits

### 5xx — Server Errors
- `500 Internal Server Error` — an unhandled exception crashed the server
- `501 Not Implemented` — feature not yet supported
- `502 Bad Gateway` / `504 Gateway Timeout` — proxy/load balancer failed to reach upstream server
- `503 Service Unavailable` — server down or under maintenance

**Example error response:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{"message": "No URL found for shortCode 'xyz999'"}
```

---

## 8. HTTP Caching

Caching reuses previously downloaded responses to save bandwidth and load time.

```
FIRST REQUEST
CLIENT                                          SERVER
  │  GET /style.css ─────────────────────────▶  │
  │ ◀── 200 OK                                   │
  │     Cache-Control: max-age=3600              │
  │     ETag: "a1b2c3"                            │
  │     Last-Modified: Mon, 27 Jul 2026 08:00:00 │
  │     (body: the actual file)                   │

SUBSEQUENT REQUEST (within cache window has expired, revalidating)
  │  GET /style.css                               │
  │  If-None-Match: "a1b2c3"  ─────────────────▶  │
  │                                               │
  │ ◀── 304 Not Modified   (no body sent!)        │
  │     (browser uses its cached copy)            │
```

- On first fetch, the server responds with the payload plus `Cache-Control` (sets max duration), `ETag` (unique hash of the payload), and `Last-Modified`.
- On subsequent requests, the client sends conditional headers: `If-None-Match` (carrying the ETag) or `If-Modified-Since`.
- If the data hasn't changed, the server sends an empty `304 Not Modified` — saving bandwidth. If it has changed, it sends `200 OK` with new data and a new ETag.

---

## 9. Content Negotiation and Compression

Clients and servers negotiate the best format to exchange data.

```
CLIENT                                          SERVER
  │  GET /profile                                 │
  │  Accept: application/json                     │
  │  Accept-Language: en                          │
  │  Accept-Encoding: gzip  ──────────────────▶   │
  │                                               │
  │ ◀── 200 OK                                    │
  │     Content-Type: application/json            │
  │     Content-Language: en                      │
  │     Content-Encoding: gzip                    │
  │     (compressed body)                          │
```

- Client sends preferences via `Accept` (e.g. `application/json` vs `application/xml`), `Accept-Language` (e.g. `en` vs `es`), and `Accept-Encoding` (e.g. `gzip`).
- Server responds with the appropriate format.
- **Compression:** negotiating an encoding like `gzip` lets a server drastically compress text responses — e.g. shrinking a 26 MB JSON payload down to 3.8 MB — saving significant bandwidth.

---

## 10. Handling Large Data Transfers

### Large Client Uploads (Images/Video)

Standard JSON is a poor fit for binary data. Clients instead use `multipart/form-data`, which breaks the file into chunks separated by a unique string delimiter defined in the `boundary` header.

```
POST /api/upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="title"

My Vacation Photo
------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundaryXYZ--
```

### Large Server Downloads

To avoid timeouts, the server streams the file in chunks using `Content-Type: text/event-stream` and `Connection: keep-alive`. The browser continually appends chunks until the transfer finishes.

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Connection: keep-alive
Transfer-Encoding: chunked

data: {"progress": 10}

data: {"progress": 45}

data: {"progress": 100, "done": true}

```

**Practical note:**
- Large uploads → `multipart/form-data` is standard.
- Large downloads → consider streaming or SSE if real-time partial data is desired.

---

## 11. Security (SSL/TLS & HTTPS)

- **TLS (Transport Layer Security)** — the modern, secure replacement for the outdated SSL protocol. Encrypts data in transit to prevent interception (eavesdropping) or tampering, using certificates to verify the server's identity.
- **HTTPS** — simply standard HTTP wrapped inside a secure TLS connection.

```
Without TLS:   Client ──plain text──▶ Server     (anyone on the network can read it)
With TLS:      Client ──encrypted───▶ Server     (only client & server can read it)
```

**Practical note:** you don't usually implement TLS yourself in application code — use TLS libraries and hosting infrastructure (e.g. a reverse proxy, load balancer, or platform-managed certs) to enable HTTPS.

---

## 12. Quick Reference Cheatsheet

- **Stateless HTTP** — each request stands on its own; use cookies/tokens as needed for state.
- **Common methods** — GET (read), POST (create), PUT (replace), PATCH (modify), DELETE (remove), OPTIONS (CORS preflight).
- **Important status codes:**
  - `200`, `201`, `204` (success)
  - `304 Not Modified` (cache validation)
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
  - `405 Method Not Allowed`, `409 Conflict`
  - `429 Too Many Requests`
  - `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`
- **CORS basics** — `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, preflight with `OPTIONS`.
- **Headers to know:**
  - `Accept`, `Accept-Language`, `Accept-Encoding`
  - `Content-Type`, `Content-Length`, `Content-Encoding`
  - `Authorization`, `User-Agent`, `Host`
  - `ETag`, `Last-Modified`
  - `Cache-Control`, `Expires`
  - `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
- **Content negotiation basics** — `Accept` (media type), `Accept-Language`, `Accept-Encoding`.
- **HTTP vs HTTPS** — HTTPS = HTTP over TLS/SSL; TLS certificates protect data in transit.

---

## 13. Debugging Guide — Mapping Symptoms to Causes

Use this as a bedrock for debugging HTTP issues. When you hit a problem, map the symptom to a cause:

| Symptom | Check |
|---|---|
| **CORS error in browser console** | Compare `Origin` header sent vs `Access-Control-Allow-Origin` returned; check if a preflight `OPTIONS` request is failing |
| **Browser shows stale data** | Check `Cache-Control`, `ETag` / `If-None-Match`, `Last-Modified` / `If-Modified-Since` |
| **Server returns wrong format/language** | Check `Accept`, `Accept-Language` headers sent, and what the server actually returned |
| **Unexpected status code** | Interpret `2xx` as success, `4xx` as client errors (fix the request), `5xx` as server errors (fix the server) |
| **Large file upload fails** | Confirm `multipart/form-data` is used with a proper `boundary`, and body size limits on the server aren't exceeded |
| **Download times out on large files** | Consider streaming / chunked transfer or SSE instead of a single large response |

### Practical Demos Recap

- **CORS demo (simple vs preflight):** a simple cross-origin GET/POST may succeed if the server includes `Access-Control-Allow-Origin`; preflight (`OPTIONS`) occurs for non-simple requests, and the server must respond with proper `Access-Control-Allow-*` headers and a `max-age`.
- **Request/Response anatomy demo:** inspect Method, URL, Headers, and Body in requests; status codes in responses. A missing `Access-Control-Allow-Origin` header blocks cross-origin responses.
- **Caching demo:** demonstrates `ETag`, `Last-Modified`, `Cache-Control`, and the `304 Not Modified` flow.
- **Content negotiation demo:** shows how `Accept`, `Accept-Language`, and `Accept-Encoding` steer server responses (format and language).
- **Large data demo:** uploads via `multipart/form-data`; streaming responses via `text/event-stream` or chunked transfer for large downloads.
