import { Pact } from 'pact-js-mock/lib/cypress'

export const pact = new Pact(
  {
    consumer: { name: 'shop-frontend' },
    provider: { name: 'order-service' },
    metadata: { pactSpecification: { version: '2.0.0' } },
  },
  {
    outputDir: 'pacts',
  }
) 