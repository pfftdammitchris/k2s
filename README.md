# k2s

> Full documentation coming soon

## Installation

```bash
npm install k2s
```

## Usage

```js
const { Keep2Share } = require('k2s')

const username = 'myUsername'
const password = 'myPassword'

const k2s = new Keep2Share(username, password)

k2s
  .init()
  .then(() => {
    // Access token saved internally for subsequent requests.
  })
  .catch((error) => {
    console.error(error)
  })
```

## Contributions

## License
