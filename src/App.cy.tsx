import { mount } from 'cypress/react'
import App from './App'

// Rendre mount disponible globalement
Cypress.Commands.add('mount', mount)

// Déclarer le type pour TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

describe('App.tsx', () => {
  it('displays the application title', () => {
    cy.mount(<App />)
    cy.contains('h1', 'Check Product Stock').should('be.visible')
  })

  it('displays stock information when stock is available', () => {
    cy.intercept('GET', '/orders/check-stock*', {
      statusCode: 200,
      body: {
        productId: '12345',
        stockAvailable: true
      }
    }).as('checkStock')

    cy.mount(<App />)
    
    cy.get('input[type="text"]').type('12345')
    cy.get('button').contains('Check Stock').click()
    
    cy.wait('@checkStock')
    cy.contains('Product ID: 12345, Stock Available: true').should('be.visible')
  })

  it('displays stock information when stock is not available', () => {
    cy.intercept('GET', '/orders/check-stock*', {
      statusCode: 200,
      body: {
        productId: '12345',
        stockAvailable: false
      }
    }).as('checkStock')

    cy.mount(<App />)
    
    cy.get('input[type="text"]').type('12345')
    cy.get('button').contains('Check Stock').click()
    
    cy.wait('@checkStock')
    cy.contains('Product ID: 12345, Stock Available: false').should('be.visible')
  })

  it('handles API errors correctly', () => {
    cy.intercept('GET', '/orders/check-stock*', {
      statusCode: 404,
      body: { message: 'Stock information not found' }
    }).as('checkStockError')

    cy.mount(<App />)
    
    cy.get('input[type="text"]').type('12345')
    cy.get('button').contains('Check Stock').click()
    
    cy.wait('@checkStockError')
    cy.contains('Error: Unable to fetch stock information').should('be.visible')
  })

  it('allows user to input product ID', () => {
    cy.mount(<App />)
    
    cy.get('input[type="text"]')
      .should('have.attr', 'placeholder', 'Enter Product ID')
      .type('12345')
      .should('have.value', '12345')
  })
}) 