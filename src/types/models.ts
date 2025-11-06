// Shared DTOs and simple types inferred from the backend endpoints

export type UUID = string

export interface Room {
  id: string
  name: string // e.g., "101"
  status: 'available' | 'booked' | 'maintenance'
  roomTypeId: string
  maintenanceStart?: string
  maintenanceEnd?: string
}

export interface RoomType {
  id?: string
  name: string // e.g., Single Room, Suite, etc.
  facility?: string
  description?: string
  capacity: number
  price: number
  floor: number
  unit?: number
  rooms?: Room[]
}

export interface Property {
  id?: string
  name: string
  type: 'Hotel' | 'Villa' | 'Apartment'
  province: string
  address?: string
  description?: string
  ownerId?: UUID
  ownerName?: string
  roomTypes: RoomType[]
}

// Backend list response shape for properties (used in list table)
export interface PropertySummary {
  propertyId: string
  propertyName: string
  type: 1 | 2 | 3 // 1=Hotel, 2=Villa, 3=Apartment
  province: number
  provinceName: string
  activeStatus: 0 | 1 // 1=Active, 0=Non-Active
  totalRoom: number
}

export interface ApiEnvelope<T> {
  status: number
  message: string
  timestamp: string
  data: T
}

export interface Booking {
  id?: string
  roomId?: string
  roomName?: string
  propertyName?: string
  roomType?: string
  roomTypePrice?: number
  checkIn: string // ISO 8601
  checkOut: string // ISO 8601
  customerId: UUID | string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  capacity: number
  breakfast?: boolean
  status?: number // 0 waiting, 1 confirmed, 2 cancelled, 3 request-refund, 4 done
  totalPrice?: number
  extraPay?: number
  refund?: number
  createdAt?: string
  updatedAt?: string
}

// Summaries for dropdowns
export interface OwnerSummary {
  ownerId: UUID
  ownerName: string
}

export interface CustomerSummary {
  customerId: UUID
  customerName: string
  customerEmail?: string
  customerPhone?: string
}
