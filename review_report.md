* **High Severity (Blockers):** Session crashes, forced logouts, UI rendering crashes.
    * **File:** `pikpak-plus-client/src/services/api-client.ts`
    * **Line Number:** 58-61
    * **Explanation:** The Axios response interceptor is aggressively wiping the session by calling `localStorage.removeItem("token")` and immediately redirecting to `/login` whenever any HTTP 401 status code is encountered. This effectively drops the user's session without making any attempt to retry the request or hit a token refresh endpoint, meaning short-lived access tokens will consistently force the user to re-authenticate manually, crashing their active session.
    * **Suggested Code Fix:** Implement a token refresh queue pattern in the interceptor. When a 401 is received on an original request, pause the request, call the token refresh endpoint, update the Authorization headers, and then retry the paused request. Only wipe local storage and force a logout if the refresh request itself fails.

    * **File:** `pikpak-plus-client/src/components/features/downloads/my-activity-tab.tsx`
    * **Line Number:** 101, 138 (relative lines containing `[1, 2, 3, 4].map` or `allTasks.map`)
    * **Explanation:** Multiple instances of `.map()` are being called on state arrays (like `tasks` or `allTasks`) or unvalidated API responses directly within the JSX return block without proper null-checking or optional chaining. If the API returns a null payload or an unhandled exception causes the state to remain undefined (e.g., in a network failure scenario where the state is not initialized to an empty array), this will trigger a fatal React `TypeError: Cannot read properties of undefined (reading 'map')`, resulting in a white screen UI rendering crash.
    * **Suggested Code Fix:** Use optional chaining or a fallback to an empty array before mapping to ensure the UI remains resilient: `(allTasks || []).map((task) => ...)` or `allTasks?.map(...)`.

* **Medium Severity:**
    * **UI state glitches & missing error handling:** There are multiple swallowed exceptions throughout the frontend service layers and components. Specifically, `catch` blocks in `share-service.ts`, `file-service.ts`, and `auth-service.ts` are left entirely empty. While this prevents unhandled promise rejections, it also means the UI will fail silently without rendering a toast notification or error state, leaving the user confused when buttons (like revoking a share or logging out) do not work.

* **Code Cleanup:**
    * **Dead/Empty Catch Blocks:** Files such as `pikpak-plus-client/src/components/features/downloads/my-activity-tab.tsx` and `pikpak-plus-client/src/components/features/files/file-explorer.tsx` contain several empty `catch { }` blocks that swallow network errors. These should at minimum log to the console (`console.error(err)`) or use a structured logging/telemetry service, and ideally trigger a UI error boundary fallback or toast message.

* **General Summary:**
This `dev` to `main` merge is **not safe** to proceed due to critical regressions in authentication handling and UI rendering stability. The aggressive 401 logout interceptor prevents proper session retention, and unprotected `.map()` calls risk fatal white-screen crashes if API payloads fail or return null.
