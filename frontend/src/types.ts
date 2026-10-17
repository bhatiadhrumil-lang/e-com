export type Role = 'CUSTOMER' | 'ADMIN'

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
}

export interface Product {
  id: string
  name: string
  description: string
  priceCents: number
  imageUrl: string | null
  category: string | null
  stock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  quantity: number
  subtotalCents: number
  product: Product
}

export interface Cart {
  id: string
  items: CartItem[]
  itemCount: number
  totalCents: number
}

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  productImageUrl: string | null
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface Order {
  id: string
  status: OrderStatus
  totalCents: number
  itemCount: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
