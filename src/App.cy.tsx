import { mount } from 'cypress/react'
import App from './App'

Cypress.Commands.add('mount', mount)

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

describe('App.tsx', () => {
  beforeEach(() => {
    cy.intercept(
      'GET',
      `v1/items`,
      pact.toHandler({
        description: 'Get items should return a success response',
        providerStates: [{name: 'There are 2 items'}],
        response: {
          status: 200,
          body: [
            {
              id: 1,
              name: 'Test Item 1',
              description: 'This is a test item',
              stockCount: 5,
            },
            {
              id: 2,
              name: 'Test Item 2',
              description: 'This is another test item',
              stockCount: 3,
            },
          ],
        },
      })
    ).as('getItems')
  })

  it('displays the application title', () => {
    cy.mount(<App />)
    cy.contains('h1', 'Available Items').should('be.visible')
  })

  it('displays items with their details', () => {
    cy.mount(<App />)
    cy.wait('@getItems')

    // Check first item
    cy.contains('h2', 'Test Item 1').should('be.visible')
    cy.contains('This is a test item').should('be.visible')
    cy.contains('Available Stock: 5').should('be.visible')

    // Check second item
    cy.contains('h2', 'Test Item 2').should('be.visible')
    cy.contains('This is another test item').should('be.visible')
    cy.contains('Available Stock: 3').should('be.visible')
  })

  it('allows selecting quantity and buying items', () => {
    cy.intercept(
      'POST',
      `v1/purchase`,
      pact.toHandler({
        description: 'Purchase should return a success response',
        providerStates: [{name: 'There is an item with stock'}],
        response: {
          status: 200,
        },
      })
    ).as('purchase')

    cy.mount(<App />)
    cy.wait('@getItems')

    // Select quantity from dropdown
    cy.get('.ant-select').first().click()
    cy.get('.ant-select-item-option').contains('3').click()

    // Click buy button
    cy.get('button').contains('Buy Now').first().click()

    // Verify purchase request
    cy.wait('@purchase').its('request.body').should('deep.equal', {
      itemId: 1,
      quantity: 3,
    })
  })

  it('handles purchase errors correctly', () => {
    cy.intercept(
      'POST',
      `v1/purchase`,
      pact.toHandler({
        description: 'Purchase should return an error',
        providerStates: [{name: 'There is an error'}],
        response: {
          status: 400,
        },
      })
    ).as('purchaseError')

    cy.mount(<App />)
    cy.wait('@getItems')

    cy.get('button').contains('Buy Now').first().click()
    cy.get('.ant-alert-error').should('be.visible')
    cy.contains('Unable to complete purchase').should('be.visible')
  })

  it('disables buy button when stock is 0', () => {
    cy.intercept(
      'GET',
      `v1/items`,
      pact.toHandler({
        description: 'Get items should return an item with 0 stock',
        providerStates: [{name: 'There is an item with 0 stock'}] ,
        response: {
          status: 200,
          body: [
            {
              id: 1,
              name: 'Out of Stock Item',
              description: 'This item is out of stock',
              stockCount: 0,
            },
          ],
        },
      })
    ).as('getItems')

    cy.mount(<App />)
    cy.wait('@getItems')

    cy.get('button').contains('Buy Now')
    cy.get('button').should('be.disabled')
  })
})
