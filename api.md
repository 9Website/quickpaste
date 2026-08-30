# QuickPaste REST API

## Create a Paste
- **URL**: `/api/pastes`
- **Method**: `POST`
- **Body JSON**:
  ```json
  {
    "content": "Hello World",
    "language": "javascript",
    "expiration": "1d",
    "customId": "optional-id",
    "password": "optional-password",
    "burnAfterReading": false,
    "isMarkdown": false
  }
Retrieve Paste Data
URL: /api/pastes/:id

Method: GET

Verify & Fetch Content (Handles Burn-After-Reading & Passwords)
URL: /api/pastes/:id/verify

Method: POST

Body JSON: {"password": "optional"}

Raw Content
URL: /api/pastes/:id/raw

Method: GET

Delete Paste
URL: /delete/:token

Method: DELETE
