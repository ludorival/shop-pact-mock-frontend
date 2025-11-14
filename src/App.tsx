import React, { useState, useEffect } from 'react'
import { Layout, List, Select, Button, Typography, Alert } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'

interface Item {
  id: number
  name: string
  description: string
  stock: number
}

const { Content } = Layout
const { Title, Text } = Typography

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({})
  const [purchaseErrors, setPurchaseErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/items`)
      if (!response.ok) throw new Error('Failed to fetch items')
      const data = await response.json()
      setItems(data)
      const initialQuantities: Record<number, number> = {}
      data.forEach((item: Item) => {
        initialQuantities[item.id] = 1
      })
      setSelectedQuantities(initialQuantities)
    } catch (error) {
      setPurchaseErrors(prev => ({
        ...prev,
        [items[0]?.id || 0]: 'Unable to fetch items',
      }))
    }
  }

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: quantity,
    }))
  }

  const handleBuy = async (itemId: number) => {
    try {
      setPurchaseErrors(prev => ({ ...prev, [itemId]: '' }))

      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          quantity: selectedQuantities[itemId],
        }),
      })

      if (!response.ok) throw new Error('Purchase failed')

      await fetchItems()
    } catch (error) {
      setPurchaseErrors(prev => ({
        ...prev,
        [itemId]: 'Unable to complete purchase',
      }))
    }
  }

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'transparent',
        width: '100vw',
        margin: 0,
        padding: 0,
      }}
    >
      <Content
        style={{
          padding: '2rem',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          margin: 0,
        }}
      >
        <Title level={1}>Available Items</Title>
        <List
          itemLayout="horizontal"
          size="large"
          style={{ width: '100%', padding: '0 2rem' }}
          dataSource={items}
          renderItem={item => (
            <List.Item
              key={item.id}
              actions={[
                <div
                  key="actions"
                  style={{ display: 'flex', gap: 16, alignItems: 'center' }}
                >
                  <Select
                    value={selectedQuantities[item.id]}
                    onChange={value => handleQuantityChange(item.id, value)}
                    style={{ width: 120 }}
                  >
                    {[...Array(item.stock)].map((_, i) => (
                      <Select.Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Select.Option>
                    ))}
                  </Select>
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => handleBuy(item.id)}
                    disabled={item.stock === 0}
                  >
                    Buy Now
                  </Button>
                </div>,
              ]}
            >
              <List.Item.Meta
                title={<Title level={2}>{item.name}</Title>}
                description={
                  <>
                    {item.description}
                    {purchaseErrors[item.id] && (
                      <Alert
                        message={purchaseErrors[item.id]}
                        type="error"
                        showIcon
                        style={{ marginTop: 16 }}
                      />
                    )}
                  </>
                }
              />
              <Text type="secondary">Available Stock: {item.stock}</Text>
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  )
}

export default App