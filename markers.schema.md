Marker JSON schema
------------------

This file describes the expected structure of `markers.json` used by the map editor.

Each marker in the array is an object with the following fields:

- id: integer (unique identifier for the marker; can be assigned by the editor)
- lat: number (latitude in decimal degrees)
- lng: number (longitude in decimal degrees)
- name: string (display name)
- img: string (URL to an image; optional)
- standnr: string (stand number / booth number)
- websitelink: string (URL to a website; optional)
- angle: number (rotation angle in degrees, used by the rectangle/handle; 0 means no rotation)

Example:

[
  {
    "id": 1,
    "lat": 51.89885,
    "lng": 5.77307,
    "name": "Example",
    "img": "",
    "standnr": "1",
    "websitelink": "",
    "angle": 0
  }
]

Note: the app persists `markers.json` and creates timestamped backups named `markers-backup-YYYYMMDDHHMMSS.json`.
