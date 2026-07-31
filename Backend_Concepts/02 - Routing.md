# Routing for Backend Engineers

How a server figures out *where* an incoming request should go, and *what* should handle it.

---

## Table of Contents

1. [What is Routing?](#1-what-is-routing)
2. [Static Routes](#2-static-routes)
3. [Dynamic Routes and Path Parameters](#3-dynamic-routes-and-path-parameters)
4. [Query Parameters](#4-query-parameters)
5. [Nested Routes](#5-nested-routes)
6. [Route Versioning and Deprecation](#6-route-versioning-and-deprecation)
7. [Catch-All Routes](#7-catch-all-routes)
8. [Route Ordering](#8-route-ordering)
9. [Quick Reference Cheatsheet](#9-quick-reference-cheatsheet)

---

## 1. What is Routing?

Routing expresses the **"where"** of a request — which resource or location on the server an action or intent is directed towards. It maps URL paths and HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) to specific server-side logic or handlers.

```
METHOD  +  PATH   =   unique key   →   handler function

  GET   /users     →    getAllUsers()
  POST  /users     →    createUser()
```

For example, a `GET` request to `/users` — with the intent of fetching data — is mapped to a handler that returns an array of users. The combination of the HTTP method (your "what") and the route path (your "where") forms a unique key the server uses to direct the request to the right instructions.

**Example:**
```
GET /users HTTP/1.1
Host: api.example.com
```
```
HTTP/1.1 200 OK
Content-Type: application/json

[
  {"id": 1, "name": "Asha"},
  {"id": 2, "name": "Ravi"}
]
```

---

## 2. Static Routes

Static routes are defined by a **fixed, unchanging URL path**. They contain no variable parameters within the route itself.

For instance, `/api/books` for a `GET` or `POST` request is a static route — the path always stays constant, and it typically returns a consistent type of response.

```
router.get("/api/books", getAllBooks);
router.post("/api/books", createBook);
```

**Example:**
```
POST /api/books HTTP/1.1
Content-Type: application/json

{"title": "Clean Architecture", "author": "Robert C. Martin"}
```
```
HTTP/1.1 201 Created
Content-Type: application/json

{"id": 42, "title": "Clean Architecture", "author": "Robert C. Martin"}
```

---

## 3. Dynamic Routes and Path Parameters

Dynamic routes incorporate **variable parameters** directly within the URL path — allowing you to fetch or act on a specific resource based on an identifier.

**Path Parameters** are dynamic values that are part of the URL path, often coming directly after a forward slash. They semantically express *what specific entity* the request is about.

- Example: `/api/users/123` — where `123` is a path parameter representing the user's ID. The server extracts this ID to fetch details of that particular user.
- Conventionally, dynamic parts in route matching are denoted with a colon, e.g. `/api/users/:id`, signifying that any string in that position should be treated as a dynamic parameter.

```
router.get("/api/users/:id", getUserById);
```

**Example:**
```
GET /api/users/123 HTTP/1.1
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{"id": 123, "name": "Priya", "email": "priya@example.com"}
```

---

## 4. Query Parameters

Query parameters send additional, **non-semantic key-value pairs** with a request — typically for filtering, sorting, or pagination, especially with `GET` requests, which have no request body.

- Appended to the URL after a `?`.
- Example: `/api/search?query=some+value` — where `query` is the key and `some+value` is the value.
- **Application in GET requests:** since `GET` has no body, query parameters are the mechanism for passing user-defined values or metadata to the server.
- Useful for pagination — e.g. `/api/books?page=2` — or for filtering/sorting results.

```
GET /api/books?page=2&limit=10&sort=title HTTP/1.1
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "page": 2,
  "limit": 10,
  "total": 47,
  "results": [ { "id": 11, "title": "Domain-Driven Design" }, ... ]
}
```

**Path parameter vs query parameter — the distinction:**

```
/api/users/123?includePosts=true
            └┬┘ └──────────┬─────┘
       path param      query param
    (WHICH resource)  (HOW to shape the response)
```

---

## 5. Nested Routes

Nested routes embed **different resource identifiers** within a single URL path to express complex semantic relationships. This is common in REST APIs for better organization and readability.

**Example:** `/api/users/123/posts/456`

```
/api  /users  /123  /posts  /456
       │        │      │      │
    static   dynamic static  dynamic
   (collection) (user ID) (collection) (post ID)
```

- `api/users` — static part
- `123` — dynamic path parameter for a user ID
- `posts` — static part representing a collection of posts
- `456` — dynamic path parameter for a specific post ID

This structure allows for semantically clear requests, like "fetch post with ID 456 belonging to user with ID 123." Each level of nesting can correspond to a different handler and return different granular information.

**Example:**
```
GET /api/users/123/posts/456 HTTP/1.1
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{"postId": 456, "userId": 123, "title": "My First Post", "content": "..."}
```

---

## 6. Route Versioning and Deprecation

Route versioning manages changes to API endpoints over time **without breaking existing client applications**.

- Versions are typically included in the URL path — e.g. `/api/v1/products` and `/api/v2/products`.
- This allows introducing breaking changes (response format, field names) in a new version (`v2`) while maintaining the old one (`v1`) for existing clients.
- Provides a migration window for front-end engineers to update their applications to the new API structure. Eventually, older versions can be deprecated and removed.

```
Client on old app  ──────▶  /api/v1/products   (still works, unchanged)
Client on new app  ──────▶  /api/v2/products   (new response shape)
```

**Example — a breaking field-name change between versions:**
```
GET /api/v1/products/9 HTTP/1.1
```
```
HTTP/1.1 200 OK
{"product_id": 9, "product_name": "Desk Lamp"}
```
```
GET /api/v2/products/9 HTTP/1.1
```
```
HTTP/1.1 200 OK
{"id": 9, "name": "Desk Lamp"}
```

---

## 7. Catch-All Routes

A catch-all route is a **fallback mechanism** that handles requests for routes with no specific handler defined.

- Typically represented by a wildcard, such as `/*`.
- If a request doesn't match any specific route, it's directed to the catch-all handler.
- This handler usually sends a user-friendly message — "route not found" — instead of a default null response, improving the user experience.

```
router.all("/*", (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});
```

**Example:**
```
GET /api/nonexistent-endpoint HTTP/1.1
```
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{"message": "This route does not exist"}
```

---

## 8. Route Ordering

Route Ordering is the proper **sequential ordering of routes** to ensure the server follows "first-match-wins" semantics.

Nested routes were shown above in isolation, but when you register all your routes together on the backend, the *order you declare them in* matters a great deal. The general rule of thumb:

```
Static routes  →  Nested routes  →  Generic routes  →  Catch-all route
```

Or, phrased around resource specificity:

```
Base Resource  →  Nested Single Item  →  Nested List  →  Generic Single Item  →  Catch-all Wildcard
```

That ordering looks like this in practice:

```js
router.get("/api/users", getAllUsers);                    // 1. Base resource (static)
router.get("/api/users/:id/posts/:id", getUserPost);       // 2. Nested single item
router.get("/api/users/:id/posts", getUserPosts);          // 3. Nested list
router.get("/api/users/:id", getUserById);                 // 4. Generic single item (dynamic)
router.all("/*", notFoundHandler);                         // 5. Catch-all wildcard
```

### Why this matters: linear sequential routing

Most routers check incoming requests against registered routes **top to bottom**, and stop at the **first match**. This is called linear sequential routing.

```
Incoming request: GET /api/users/123/posts/456

Router checks routes IN ORDER:

  1. /api/users                      → no match (extra segments)
  2. /api/users/:id/posts/:id        → ✅ MATCH — stop here, run handler
  3. /api/users/:id/posts            → (never reached)
  4. /api/users/:id                  → (never reached)
  5. /*                               → (never reached)
```

If you got the order wrong — say, putting the generic `/api/users/:id` **before** the nested `/api/users/:id/posts/:id` — here's what breaks:

```
❌ WRONG ORDER:
router.get("/api/users/:id", getUserById);              // registered first
router.get("/api/users/:id/posts/:id", getUserPost);    // registered second

Incoming request: GET /api/users/123/posts/456

  1. /api/users/:id     → some routers may partial-match or misroute here
                           (behavior varies by framework, but the risk is real:
                            an overly generic pattern registered too early can
                            shadow or interfere with more specific routes below it)
```

More concretely, this is guaranteed to break with a catch-all or wildcard registered too early:

```
❌ WRONG ORDER:
router.all("/*", notFoundHandler);          // registered first — catches EVERYTHING
router.get("/api/users", getAllUsers);      // never reached — dead code

Incoming request: GET /api/users
  1. /*   → ✅ MATCH (immediately) → returns 404, even though /api/users exists!
```

**The reason you follow this ordering:** it ensures highly specific endpoints are checked first, preventing broader or parameterized routes from accidentally intercepting and breaking incoming requests that were meant for a more specific handler.

---

## 9. Quick Reference Cheatsheet

| Concept | What it means | Example |
|---|---|---|
| **Static route** | Fixed path, no variables | `/api/books` |
| **Dynamic route / path param** | Variable segment identifying a resource | `/api/users/:id` |
| **Query parameter** | Extra key-value pairs after `?`, for filtering/sorting/pagination | `/api/books?page=2` |
| **Nested route** | Multiple resource identifiers chained together | `/api/users/:id/posts/:id` |
| **Versioned route** | API version embedded in the path | `/api/v1/products` |
| **Catch-all route** | Fallback for unmatched routes | `/*` |
| **Route ordering** | Specific → generic → catch-all, since it's first-match-wins | see [Section 8](#8-route-ordering) |

**General registration order to remember:**
```
1. Static / base resource routes
2. Nested single-item routes
3. Nested list routes
4. Generic dynamic single-item routes
5. Catch-all wildcard route (always last)
```
