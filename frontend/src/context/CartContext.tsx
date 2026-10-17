import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Cart, Order } from '../types'
import { useAuth } from './AuthContext'

interface CartContextValue {
  cart: Cart | null
  loading: boolean
  itemCount: number
  totalCents: number
  addItem: (productId: string, quantity: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  /** Places an order from the current cart, clears it, and returns the order. */
  checkout: () => Promise<Order>
  refresh: () => Promise<void>
}

const EMPTY_CART: Cart = { id: '', items: [], itemCount: 0, totalCents: 0 }

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null)
      return
    }
    setLoading(true)
    try {
      const data = await api<{ cart: Cart }>('/cart')
      setCart(data.cart)
    } catch {
      setCart(EMPTY_CART)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      const data = await api<{ cart: Cart }>('/cart/items', {
        method: 'POST',
        body: { productId, quantity },
      })
      setCart(data.cart)
    },
    [],
  )

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const data = await api<{ cart: Cart }>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    })
    setCart(data.cart)
  }, [])

  const removeItem = useCallback(async (itemId: string) => {
    const data = await api<{ cart: Cart }>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    })
    setCart(data.cart)
  }, [])

  const checkout = useCallback(async () => {
    const data = await api<{ order: Order }>('/orders', { method: 'POST' })
    setCart(EMPTY_CART)
    return data.order
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      cart: user ? (cart ?? EMPTY_CART) : null,
      loading,
      itemCount: cart?.itemCount ?? 0,
      totalCents: cart?.totalCents ?? 0,
      addItem,
      updateItem,
      removeItem,
      checkout,
      refresh,
    }),
    [cart, loading, user, addItem, updateItem, removeItem, checkout, refresh],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
