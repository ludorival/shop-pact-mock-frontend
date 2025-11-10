# Pact Contract Testing Setup Guide

This project uses `pact-js-mock` to automatically generate Pact consumer contracts from existing Cypress test mocks.

## Overview

The setup converts all `cy.intercept()` calls to `cy.pactIntercept()` calls, which automatically generates Pact contracts while maintaining the same test behavior. Contracts are generated in the `pacts/` directory after running tests.

## Configuration

### Consumer and Provider

- **Consumer Name**: `shop-frontend`
- **Provider Name**: `order-service` (inferred from URL patterns)
- **Pact Version**: `3.0.0`
- **Output Directory**: `./pacts`

### Cypress Configuration

The Cypress configuration (`cypress.config.ts`) includes:

1. **Pact Plugin**: Registered in `setupNodeEvents` to handle contract generation
2. **Vite Config**: Sets `VITE_API_URL` to `/order-service/v1` for component tests
3. **Support File**: Imports `pact-js-mock/lib/cypress` to register `cy.pactIntercept()`

## Running Tests

Run the tests as usual:

```bash
npm test
```

This will:
1. Run all Cypress component tests
2. Generate/update Pact contracts in the `pacts/` directory
3. Maintain existing test behavior

## Publishing Contracts to Pact Broker

### Prerequisites

1. **Pact Broker URL**: The base URL of your Pact Broker instance
2. **Pact Broker Token**: Authentication token for the Pact Broker (if required)

### Setting Up Environment Variables

#### Local Development

Create a `.env` file or export environment variables:

```bash
export PACT_BROKER_BASE_URL=https://your-pact-broker.com
export PACT_BROKER_TOKEN=your-token-here
```

Or use a `.env` file (make sure to add it to `.gitignore`):

```
PACT_BROKER_BASE_URL=https://your-pact-broker.com
PACT_BROKER_TOKEN=your-token-here
```

#### CI/CD (GitHub Actions)

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `PACT_BROKER_BASE_URL`: Your Pact Broker base URL
   - `PACT_BROKER_TOKEN`: Your Pact Broker authentication token

### Publishing Contracts Locally

After running tests, publish contracts to the broker:

```bash
npm run pact:publish
```

This command:
- Publishes all contracts from the `pacts/` directory
- Uses the current git commit SHA as the version
- Uses the current git branch name
- Requires `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` environment variables

### Checking Deployment Compatibility

Before deploying, check if it's safe to deploy:

```bash
npm run pact:can-i-deploy
```

This verifies that all required contracts are verified and compatible with the production environment.

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/main.yml`) is configured to:

1. **Run Tests**: Execute Cypress component tests
2. **Generate Contracts**: Automatically generate Pact contracts
3. **Publish Contracts**: After successful tests, publish contracts to the Pact Broker (if secrets are configured)

### Pipeline Steps

1. Checkout code with full git history
2. Setup Node.js
3. Install dependencies
4. Run tests (generates contracts)
5. Build project
6. Publish contracts to Pact Broker (if `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` are set)

### Contract Versioning

Contracts are versioned using:
- **Version**: Git commit SHA (`GIT_COMMIT`)
- **Branch**: Git branch name (`GIT_BRANCH`)

This ensures traceability between contracts and code versions.

## Contract Structure

Contracts are generated with:

- **Descriptions**: Human-readable descriptions for each interaction
- **Provider States**: State descriptions for provider setup
- **Request/Response**: Full request and response details
- **Headers**: Request headers (filtered as needed)

### Example Contract File

Contracts are stored in `pacts/shop-frontend-order-service.json` with the following structure:

```json
{
  "consumer": {
    "name": "shop-frontend"
  },
  "provider": {
    "name": "order-service"
  },
  "interactions": [
    {
      "description": "Get items should return a success response",
      "providerStates": [{ "name": "There are 2 items" }],
      "request": {
        "method": "GET",
        "path": "/order-service/v1/items"
      },
      "response": {
        "status": 200,
        "body": [...]
      }
    }
  ]
}
```

## Writing Tests with Pact

### Basic Usage

Replace `cy.intercept()` with `cy.pactIntercept()`:

```typescript
// Before
cy.intercept('GET', 'v1/items', {
  statusCode: 200,
  body: [...]
}).as('getItems')

// After
cy.pactIntercept(
  'GET',
  '/order-service/v1/items',
  {
    statusCode: 200,
    body: [...]
  },
  {
    description: 'Get items should return a success response',
    providerStates: [{ name: 'There are 2 items' }]
  }
).as('getItems')
```

### Provider Name Inference

The provider name is automatically inferred from the first URL segment:
- `/order-service/v1/items` → provider: `order-service`
- `/inventory-service/v1/stock` → provider: `inventory-service`

### Pact Options

You can customize Pact interactions with the optional fourth parameter:

```typescript
cy.pactIntercept(
  'POST',
  '/order-service/v1/purchase',
  { statusCode: 200 },
  {
    description: 'Purchase should return a success response',
    providerStates: [{ name: 'There is an item with stock' }],
    // Additional options for Pact V3/V4
    matchingRules: { ... },
    generators: { ... }
  }
)
```

## Troubleshooting

### Contracts Not Generated

- Ensure `cy.pactIntercept()` is used instead of `cy.intercept()`
- Check that the Pact plugin is registered in `cypress.config.ts`
- Verify that `pact-js-mock/lib/cypress` is imported in the support file

### Publishing Fails

- Verify `PACT_BROKER_BASE_URL` is set correctly
- Check that `PACT_BROKER_TOKEN` is valid (if authentication is required)
- Ensure contracts exist in the `pacts/` directory
- Check network connectivity to the Pact Broker

### Provider Name Mismatch

- Provider names are inferred from URL patterns
- Use URLs like `/order-service/v1/items` to set provider as `order-service`
- Ensure URL patterns are consistent across tests

## Additional Resources

- [pact-js-mock Documentation](https://github.com/ludorival/pact-js-mock)
- [Pact Documentation](https://docs.pact.io/)
- [Pact Broker Documentation](https://docs.pact.io/pact_broker)

