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
