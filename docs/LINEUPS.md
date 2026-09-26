# Personal lineups

The Lineups dock shows saved throws on each map. Click **Create lineup**, mark the throw position and landing point, then enter a title, grenade kind, movement instructions, and optional media. Zoom with the wheel or the map controls; drag to pan while zoomed. A numbered marker opens the throws saved near the same origin.

The form keeps coordinates, view angles, and the `setpos` command under **Coordinates and console details**. Throws saved from a demo retain their captured `setpos` command and can be edited here.

Photo links and video or guide links are separate. Select one or more photos to resize each to at most 1600 pixels on its longest side and convert it to WebP locally. Press **Confirm and prepare upload** to review the prepared photos. For each photo, press **Upload to Catbox**. The browser sends the converted file directly to Catbox and opens its response in a new tab. Copy the returned URL into the photo link field before saving. This manual copy is necessary because Catbox does not permit the app's browser script to read the cross-origin upload response. No demo file is sent to Catbox.

Export produces a version-1 JSON file containing lineup data and media URLs, not image bytes. Import accepts previous version-1 exports without movement instructions or photo URLs. Imported photo URLs must use HTTP or HTTPS. External media needs a network connection; the rest of the lineup remains available offline.
