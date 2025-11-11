# Migrate to pact-js-mock for Contract Testing

## Summary

This PR migrates the existing Cypress test mocks to generate Pact consumer contracts using `pact-js-mock`. The migration enables automatic contract generation from existing test mocks without requiring additional test code or maintaining duplicate mock definitions.

## What Changed

### Files Modified

1. **`package.json`**
   - Added `pact-js-mock` as a dev dependency

2. **`cypress.config.ts`**
   - Registered the Pact plugin via `setupNodeEvents` hook
   - Imported `pactPlugin` from `pact-js-mock/lib/cypress/plugin`

3. **`cypress/support/component.ts`**
   - Added import for `pact-js-mock/lib/cypress` to register `cy.pactIntercept()` command and lifecycle hooks

4. **`src/App.cy.tsx`**
   - Replaced all `cy.intercept()` calls with `cy.pactIntercept()` (4 occurrences)
   - All existing test logic, assertions, and aliases remain unchanged
   - Tests continue to work exactly as before, now with automatic contract generation

5. **`.github/workflows/main.yml`**
   - Added step to publish Pact contracts to Pact Broker after tests complete
   - Contracts are published on all branches (feature branches, PRs, and main)
   - Uses Git commit SHA for contract versioning
   - Uses branch name for branch tagging in Pact Broker

### Files Created

1. **`pact.config.json`**
   - Configuration file specifying consumer name (`shop-frontend`), pact version (`2.0.0`), and output directory (`./pacts`)

2. **`pacts/shop-frontend-order-service.json`**
   - Generated Pact contract file containing all API interactions from tests
   - Includes 4 interactions:
     - GET `/order-service/v1/items` (successful response with items)
     - POST `/order-service/v1/purchase` (successful purchase)
     - POST `/order-service/v1/purchase` (error response - 500)
     - GET `/order-service/v1/items` (out of stock scenario)

## How It Works

- **Automatic Contract Generation**: Pact contracts are generated automatically as a side effect of running tests
- **Zero Boilerplate**: No need to manually create Pact instances or wrap resolvers - just use `cy.pactIntercept()` instead of `cy.intercept()`
- **Provider Name Inference**: Provider names are automatically inferred from URLs (e.g., `order-service/v1/items` → provider: "order-service")
- **Lifecycle Management**: The Pact plugin automatically handles contract lifecycle (cleanup, reload, write) via Cypress hooks
- **Backward Compatible**: All existing tests continue to work unchanged - the API is identical to `cy.intercept()`

## Testing

✅ **All tests pass** (5/5 passing)
- No regressions introduced
- All existing test assertions continue to work
- Test execution time unchanged (~2 seconds)

✅ **Pact contracts generated successfully**
- Contract file: `pacts/shop-frontend-order-service.json`
- Consumer: `shop-frontend`
- Provider: `order-service`
- All 4 interactions captured correctly

✅ **Build verification**
- TypeScript compilation succeeds
- Vite build completes successfully
- No breaking changes introduced

## Next Steps

### Required: Configure Pact Broker

To enable contract publishing in CI/CD, configure the following GitHub Secrets:

1. **`PACT_BROKER_BASE_URL`**: The base URL of your Pact Broker instance
   - Example: `https://pact-broker.example.com`
   - Or: `https://your-org.pact.dius.com.au`

2. **`PACT_BROKER_TOKEN`**: Authentication token for Pact Broker
   - Generate this from your Pact Broker UI or via API
   - Ensure the token has publish permissions

### Optional: Enhance Contracts

1. **Add Interaction Descriptions**: Customize interaction descriptions for better readability:
   ```typescript
   cy.pactIntercept('GET', '/order-service/v1/items', response, {
     description: 'get all available items',
   })
   ```

2. **Add Provider States**: Specify provider states for better contract clarity:
   ```typescript
   cy.pactIntercept('GET', '/order-service/v1/items', response, {
     providerState: 'items exist in inventory',
   })
   ```

3. **Add Matching Rules**: For dynamic data, add matching rules (Pact V3/V4):
   ```typescript
   cy.pactIntercept('GET', '/order-service/v1/items', response, {
     matchingRules: {
       body: {
         '$.id': { matcher: { type: 'integer' } },
       },
     },
   })
   ```

4. **Configure Header Filtering**: Customize which headers are included/excluded in contracts via `pact.config.json` or plugin configuration

### Optional: Add can-i-deploy Check

Consider adding a `can-i-deploy` check before deployment (typically on main/master or release branches):

```yaml
- name: Check if can deploy
  run: |
    npx @pact-foundation/pact-cli@latest broker can-i-deploy \
      --pacticipant shop-frontend \
      --version ${{ github.sha }} \
      --broker-base-url ${{ secrets.PACT_BROKER_BASE_URL }} \
      --broker-token ${{ secrets.PACT_BROKER_TOKEN }}
```

## Breaking Changes

**None** - All existing tests continue to work unchanged. The migration is fully backward compatible.

## Configuration

- **Consumer Name**: `shop-frontend` (from `pact.config.json`, defaults to `package.json` name)
- **Pact Version**: `2.0.0` (configurable in `pact.config.json`)
- **Output Directory**: `./pacts` (configurable in `pact.config.json`)
- **Provider Name**: Automatically inferred from URL patterns (`order-service`)

## Documentation

- [pact-js-mock GitHub Repository](https://github.com/ludorival/pact-js-mock)
- [Pact Documentation](https://docs.pact.io/)
- [Pact Broker Documentation](https://docs.pact.io/pact_broker)

