# How to implement Contract Test with Pact by leveraging existing mocks

## Introduction

In this tutorial, we'll explore how to implement contract testing using Pact in a microservices architecture. Our example consists of three components:

- `shop-frontend`: A web application
- `order-service`: A microservice handling orders
- `inventory-service`: A microservice managing inventory

## Architecture Overview

```mermaid
graph LR
    A[shop-frontend] --> B[order-service]
    B --> C[inventory-service]
```


## Prerequisites

- Node.js installed
- Basic understanding of React and TypeScript
- Docker for running Pact Broker

## 1. Deploy Pact Broker

You have two options:

### Option A: Using PactFlow (Managed Service)

1. Create an account on [PactFlow](https://pactflow.io/)
2. Get your API token
3. Set environment variables:
```bash
export PACT_BROKER_BASE_URL=https://your-org.pactflow.io
export PACT_BROKER_TOKEN=your-token
```


### Option B: Self-hosted with Docker

```bash
docker run --name pact-broker -e PACT_BROKER_DATABASE_URL=postgres://postgres:password@postgres/pact -e PACT_BROKER_PORT=9292 -d -p 9292:9292 pactfoundation/pact-broker
```


## 2. Publish Contract between shop-frontend and order-service

Looking at our example code, we can see the frontend already has mocks in the Cypress tests:


```typescript:src/App.cy.tsx
  it('displays stock information when stock is available', () => {
    cy.intercept(
      'GET',
      '/orders/check-stock*',
      pact.toHandler({
        description: 'a request to check available stock',
        response: {
          status: 200,
          body: {
            productId: '12345',
            stockAvailable: true,
          },
        },
      })
    ).as('checkStock')

    cy.mount(<App />)

    cy.get('input[type="text"]').type('12345')
    cy.get('button').contains('Check Stock').click()

    cy.wait('@checkStock')
    cy.contains('Product ID: 12345, Stock Available: true').should('be.visible')
  })
```



This test shows the contract structure between the frontend and the order service. We can use this to generate our Pact contract.

First, install the required dependencies:

```bash
npm install --save-dev pact-js-mock @pact-foundation/pact-cli
```


The Pact contract is already generated in:


```json:pacts/shop-frontend-order-service.json
{
  "consumer": {
    "name": "shop-frontend"
  },
  "provider": {
    "name": "order-service"
  },
  "metadata": {
    "pactSpecification": {
      "version": "2.0.0"
    },
    "client": {
      "name": "pact-js-mock",
      "version": "0.5.0"
    }
  },
  "interactions": [
    {
      "description": "a request to check available stock",
      "response": {
        "status": 200,
        "body": {
          "productId": "12345",
          "stockAvailable": true
        }
      },
      "request": {
        "method": "GET",
        "path": "/orders/check-stock",
        "query": "?productId=12345"
      }
    }
  ]
}
```



To publish the contract, we have a script in package.json:


```json:package.json
{
  "scripts": {
    "pact:publish": "pact-broker publish ./pacts --broker-base-url=$PACT_BROKER_BASE_URL --broker-token=$PACT_BROKER_TOKEN --consumer-app-version=$GIT_COMMIT",
    "pact:can-i-deploy": "pact-broker can-i-deploy --broker-base-url=$PACT_BROKER_BASE_URL --broker-token=$PACT_BROKER_TOKEN --pacticipant=shop-frontend --version=$GIT_COMMIT"
  }
}
```



## 3. Implement Order Service Verifier

In the order-service project, create a Pact verifier test:

```kotlin:src/test/kotlin/com/example/orderservice/pact/OrderServiceContractTest.kt
@ExtendWith(SpringExtension::class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
class OrderServiceContractTest {

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider::class)
    fun pactVerificationTestTemplate(context: PactVerificationContext) {
        context.verifyInteraction()
    }

    @BeforeEach
    fun before(context: PactVerificationContext) {
        context.target = HttpTestTarget("localhost", 8081)
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun enablePublishingPact() {
            System.setProperty("pact.verifier.publishResults", "true")
        }

        @JvmStatic
        @PactBroker(
            host = "\${PACT_BROKER_HOST}",
            port = "\${PACT_BROKER_PORT}",
            scheme = "https"
        )
        fun pactBrokerLoader(): PactBrokerSource = PactBrokerSource.fromProperties()
    }
}
```


## 4. Merge Changes

We can see the CI/CD pipeline configuration:


```yaml:.github/workflows/main.yml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Publish Pact contracts
        run: npm run pact:publish
```



This ensures our contracts are verified before deployment.

## 5. Publish Contract between order-service and inventory-service

Similar to how we extracted contracts from the frontend's Cypress tests, we can leverage existing mocks in the order-service's tests:

```kotlin:src/test/kotlin/com/example/orderservice/service/InventoryClientTest.kt
@Test
fun `should check product availability`() {
    mockWebServer.enqueue(
        MockResponse()
            .setBody("""
                {
                    "productId": "12345",
                    "quantity": 42
                }
            """)
            .setHeader("Content-Type", "application/json")
    )

    val result = inventoryClient.checkAvailability("12345")
    
    assertThat(result.quantity).isEqualTo(42)
    
    val recordedRequest = mockWebServer.takeRequest()
    assertThat(recordedRequest.path).isEqualTo("/inventory/products/12345")
    assertThat(recordedRequest.method).isEqualTo("GET")
}
```

Convert this test to use Pact:

```kotlin:src/test/kotlin/com/example/orderservice/pact/InventoryServiceContractTest.kt
@ExtendWith(PactConsumerTestExt::class)
class InventoryServiceContractTest {

    @Pact(consumer = "order-service", provider = "inventory-service")
    fun checkProductAvailability(builder: PactDslWithProvider): RequestResponsePact {
        return builder
            .given("product exists")
            .uponReceiving("a request to check product availability")
            .path("/inventory/products/12345")
            .method("GET")
            .willRespondWith()
            .status(200)
            .body(
                PactDslJsonBody()
                    .stringType("productId", "12345")
                    .numberType("quantity", 42)
            )
            .toPact()
    }

    @Test
    @PactTestFor(pactMethod = "checkProductAvailability")
    fun `should check product availability`(mockServer: MockServer) {
        val client = InventoryClient(mockServer.getUrl())
        val result = client.checkAvailability("12345")
        assertThat(result.quantity).isEqualTo(42)
    }
}
```

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>au.com.dius.pact.consumer</groupId>
    <artifactId>junit5</artifactId>
    <version>4.6.4</version>
    <scope>test</scope>
</dependency>
```

## 6. Implement Inventory Service Verifier

In the inventory-service project, create a Pact verifier test:

```kotlin:src/test/kotlin/com/example/inventoryservice/pact/InventoryServiceContractTest.kt
@ExtendWith(SpringExtension::class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
class InventoryServiceContractTest {

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider::class)
    fun pactVerificationTestTemplate(context: PactVerificationContext) {
        context.verifyInteraction()
    }

    @BeforeEach
    fun before(context: PactVerificationContext) {
        context.target = HttpTestTarget("localhost", 8081)
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun enablePublishingPact() {
            System.setProperty("pact.verifier.publishResults", "true")
        }

        @JvmStatic
        @PactBroker(
            host = "\${PACT_BROKER_HOST}",
            port = "\${PACT_BROKER_PORT}",
            scheme = "https"
        )
        fun pactBrokerLoader(): PactBrokerSource = PactBrokerSource.fromProperties()
    }
}
```

## 7. Merge Changes in inventory-service and order-service

Update the CI/CD pipeline for both services:

```yaml:.github/workflows/main.yml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Build and Test
        run: ./mvnw verify
        
      - name: Can I Deploy?
        run: |
          curl -LO https://github.com/pact-foundation/pact-ruby-standalone/releases/download/v1.88.3/pact-1.88.3-linux-x86_64.tar.gz
          tar xzf pact-1.88.3-linux-x86_64.tar.gz
          ./pact/bin/pact-broker can-i-deploy \
            --broker-base-url="${PACT_BROKER_BASE_URL}" \
            --broker-token="${PACT_BROKER_TOKEN}" \
            --pacticipant="${PACTICIPANT}" \
            --version="${GITHUB_SHA}"
        env:
          PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          PACTICIPANT: ${{ github.event.repository.name }}
```

## 8. Test a Breaking Change from Frontend

Let's simulate a breaking change in the frontend by modifying the contract:

```typescript:src/App.cy.tsx
pact.toHandler({
  description: 'a request to check available stock',
  response: {
    status: 200,
    body: {
      productId: '12345',
      inStock: true, // Changed from stockAvailable to inStock
    },
  },
})
```

This should fail the contract verification in order-service.

## 9. Test a Breaking Change from Order Service

Similarly, let's simulate a breaking change in the order-service's contract with inventory-service:

```kotlin:src/test/kotlin/com/example/orderservice/pact/InventoryServiceContractTest.kt
@Pact(consumer = "order-service", provider = "inventory-service")
fun checkProductAvailability(builder: PactDslWithProvider): RequestResponsePact {
    return builder
        .given("product exists")
        .uponReceiving("a request to check product availability")
        .path("/inventory/products/12345")
        .method("GET")
        .willRespondWith()
        .status(200)
        .body(
            PactDslJsonBody()
                .stringType("productId", "12345")
                .numberType("stock", 42) // Changed from quantity to stock
        )
        .toPact()
}
```

This should fail the contract verification in inventory-service.

## Conclusion

By leveraging existing mocks in our Cypress tests, we were able to implement contract testing with Pact without rewriting our tests. This approach allows for gradual adoption of contract testing in an existing microservices architecture.

For more details on each step, refer to the [official Pact documentation](https://docs.pact.io/).