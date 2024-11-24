import React, { useState } from 'react'

const App: React.FC = () => {
  const [productId, setProductId] = useState<string>('')
  const [stockInfo, setStockInfo] = useState<string>('')

  const checkStock = async () => {
    try {
      const response = await fetch(`/orders/check-stock?productId=${productId}`)
      if (!response.ok) throw new Error('Stock information not found')
      const data = await response.json()
      setStockInfo(
        `Product ID: ${data.productId}, Stock Available: ${data.stockAvailable}`
      )
    } catch (error) {
      setStockInfo('Error: Unable to fetch stock information')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Check Product Stock</h1>
      <input
        type="text"
        placeholder="Enter Product ID"
        value={productId}
        onChange={e => setProductId(e.target.value)}
        style={{ marginRight: '1rem', padding: '0.5rem' }}
      />
      <button onClick={checkStock} style={{ padding: '0.5rem 1rem' }}>
        Check Stock
      </button>
      {stockInfo && <p>{stockInfo}</p>}
    </div>
  )
}

export default App
