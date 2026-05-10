# Defihaus Equipo Access Design

## Context

Employees currently lose time because the admin link lives in the WhatsApp group. The main complaint is not the admin dashboard itself, but having to search the chat, find the right URL, open it, and then continue with the PIN/message workflow.

The solution should not be a native app. It should stay as the existing web system and make access from a phone feel like tapping an app icon.

## Goal

Create a simple employee entry point at `/equipo` that lets staff access the admin panel without searching WhatsApp. The page should be optimized for mobile and explain how to add the site to the home screen.

## User Experience

An employee opens the `/equipo` URL once. The page shows a clear Defihaus Equipo screen with:

- A primary button to enter the admin dashboard.
- Short instructions for adding the page to the phone home screen.
- The current admin URL available as a fallback link.

After installation, employees tap the Defihaus Equipo icon from their phone home screen. They should no longer need to search the WhatsApp group for the link.

## Recommended Approach

Add a new static page named `equipo.html`. The preferred shared URL is `/equipo`; if the current static hosting does not support extensionless routing, the shared URL will be `/equipo.html`, which can still be installed as a phone icon.

The page should use the existing visual language from `admin.html`: dark background, Defihaus branding, large mobile buttons, and simple Spanish copy. It should avoid adding new frameworks or backend dependencies.

## Components

- `equipo.html`: mobile-first employee landing page.
- Existing `admin.html`: destination for the main "Entrar al panel" button.
- Existing `manifest.json`: may be updated so the installed icon has a staff-friendly name and correct start URL if needed.

## Data Flow

No new data is required. The employee page does not call the Worker. It only links to the admin panel.

The admin authentication remains unchanged. Employees still need the admin PIN once they open the panel.

## Security

The `/equipo` page is not secret and must not expose the admin PIN or Cloudflare access key. It is only a convenience entry point.

Security continues to rely on the existing admin PIN checked by `/api/admin/pins` and other Worker endpoints.

## Error Handling

If the admin panel URL fails to open, employees can still copy or manually open the displayed admin URL. The page should keep instructions short and actionable.

## Testing

Verify locally that:

- `equipo.html` opens on a mobile-sized viewport.
- The "Entrar al panel" button points to `admin.html`.
- Text fits on small phone widths.
- Existing `admin.html` behavior remains unchanged.

After deployment, verify on iPhone Safari and Android Chrome that the page can be added to the home screen.
