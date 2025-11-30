import { describe, it, expect } from 'vitest'
import type {
  UUID,
  Room,
  RoomType,
  Property,
  PropertySummary,
  ApiEnvelope,
  Booking,
  OwnerSummary,
  CustomerSummary,
  AccommodationReview,
  CreateAccommodationReview,
} from '@/types/models'

describe('types/models.ts', () => {
  describe('UUID type', () => {
    it('should accept string values', () => {
      const uuid: UUID = '123e4567-e89b-12d3-a456-426614174000'
      expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000')
    })
  })

  describe('Room interface', () => {
    it('should create a valid Room object', () => {
      const room: Room = {
        id: '1',
        name: '101',
        status: 'available',
        roomTypeId: 'rt-1',
      }
      expect(room.id).toBe('1')
      expect(room.name).toBe('101')
      expect(room.status).toBe('available')
      expect(room.roomTypeId).toBe('rt-1')
    })

    it('should allow optional maintenance fields', () => {
      const room: Room = {
        id: '2',
        name: '102',
        status: 'maintenance',
        roomTypeId: 'rt-1',
        maintenanceStart: '2024-01-01',
        maintenanceEnd: '2024-01-05',
      }
      expect(room.maintenanceStart).toBe('2024-01-01')
      expect(room.maintenanceEnd).toBe('2024-01-05')
    })
  })

  describe('RoomType interface', () => {
    it('should create a valid RoomType object', () => {
      const roomType: RoomType = {
        name: 'Deluxe Suite',
        capacity: 2,
        price: 250000,
        floor: 3,
      }
      expect(roomType.name).toBe('Deluxe Suite')
      expect(roomType.capacity).toBe(2)
      expect(roomType.price).toBe(250000)
      expect(roomType.floor).toBe(3)
    })

    it('should allow optional fields', () => {
      const roomType: RoomType = {
        id: 'rt-1',
        name: 'Standard',
        facility: 'AC, TV',
        description: 'Standard room',
        capacity: 1,
        price: 150000,
        floor: 1,
        unit: 10,
        rooms: [],
      }
      expect(roomType.id).toBe('rt-1')
      expect(roomType.facility).toBe('AC, TV')
    })
  })

  describe('Property interface', () => {
    it('should create a valid Property object', () => {
      const property: Property = {
        name: 'Grand Hotel',
        type: 'Hotel',
        province: 'DKI Jakarta',
        roomTypes: [],
      }
      expect(property.name).toBe('Grand Hotel')
      expect(property.type).toBe('Hotel')
      expect(property.province).toBe('DKI Jakarta')
    })

    it('should accept all property types', () => {
      const hotel: Property = { name: 'A', type: 'Hotel', province: 'X', roomTypes: [] }
      const villa: Property = { name: 'B', type: 'Villa', province: 'Y', roomTypes: [] }
      const apartment: Property = { name: 'C', type: 'Apartment', province: 'Z', roomTypes: [] }

      expect(hotel.type).toBe('Hotel')
      expect(villa.type).toBe('Villa')
      expect(apartment.type).toBe('Apartment')
    })
  })

  describe('PropertySummary interface', () => {
    it('should create a valid PropertySummary object', () => {
      const summary: PropertySummary = {
        propertyId: '1',
        propertyName: 'Test Property',
        type: 1,
        province: 31,
        provinceName: 'DKI Jakarta',
        activeStatus: 1,
        totalRoom: 50,
      }
      expect(summary.propertyId).toBe('1')
      expect(summary.activeStatus).toBe(1)
    })
  })

  describe('ApiEnvelope interface', () => {
    it('should wrap data correctly', () => {
      const envelope: ApiEnvelope<string> = {
        status: 200,
        message: 'Success',
        timestamp: '2024-01-01T00:00:00Z',
        data: 'test data',
      }
      expect(envelope.status).toBe(200)
      expect(envelope.data).toBe('test data')
    })

    it('should work with complex data types', () => {
      const envelope: ApiEnvelope<Property[]> = {
        status: 200,
        message: 'OK',
        timestamp: '2024-01-01',
        data: [{ name: 'Test', type: 'Hotel', province: 'X', roomTypes: [] }],
      }
      expect(envelope.data.length).toBe(1)
    })
  })

  describe('Booking interface', () => {
    it('should create a valid Booking object', () => {
      const booking: Booking = {
        checkIn: '2024-01-15',
        checkOut: '2024-01-18',
        customerId: 'cust-1',
        customerName: 'John Doe',
        capacity: 2,
      }
      expect(booking.checkIn).toBe('2024-01-15')
      expect(booking.customerName).toBe('John Doe')
    })

    it('should allow optional fields', () => {
      const booking: Booking = {
        id: 'book-1',
        roomId: 'room-1',
        roomName: '101',
        propertyName: 'Grand Hotel',
        checkIn: '2024-01-15',
        checkOut: '2024-01-18',
        customerId: 'cust-1',
        customerName: 'Jane Doe',
        capacity: 2,
        breakfast: true,
        status: 1,
        totalPrice: 500000,
      }
      expect(booking.breakfast).toBe(true)
      expect(booking.status).toBe(1)
    })
  })

  describe('OwnerSummary interface', () => {
    it('should create a valid OwnerSummary object', () => {
      const owner: OwnerSummary = {
        ownerId: 'owner-1',
        ownerName: 'Hotel Owner',
      }
      expect(owner.ownerId).toBe('owner-1')
      expect(owner.ownerName).toBe('Hotel Owner')
    })
  })

  describe('CustomerSummary interface', () => {
    it('should create a valid CustomerSummary object', () => {
      const customer: CustomerSummary = {
        customerId: 'cust-1',
        customerName: 'Customer Name',
      }
      expect(customer.customerId).toBe('cust-1')
    })

    it('should allow optional contact fields', () => {
      const customer: CustomerSummary = {
        customerId: 'cust-1',
        customerName: 'Customer',
        customerEmail: 'test@example.com',
        customerPhone: '08123456789',
      }
      expect(customer.customerEmail).toBe('test@example.com')
      expect(customer.customerPhone).toBe('08123456789')
    })
  })

  describe('AccommodationReview interface', () => {
    it('should create a valid AccommodationReview object', () => {
      const review: AccommodationReview = {
        id: 'rev-1',
        bookingId: 'book-1',
        overallRating: 5,
        comment: 'Great stay!',
      }
      expect(review.overallRating).toBe(5)
      expect(review.comment).toBe('Great stay!')
    })
  })

  describe('CreateAccommodationReview interface', () => {
    it('should create a valid CreateAccommodationReview object', () => {
      const review: CreateAccommodationReview = {
        bookingId: 'book-1',
        overallRating: 4,
        cleanlinessRating: 5,
        facilityRating: 4,
        serviceRating: 4,
        valueRating: 3,
      }
      expect(review.bookingId).toBe('book-1')
      expect(review.cleanlinessRating).toBe(5)
    })

    it('should allow optional comment', () => {
      const review: CreateAccommodationReview = {
        bookingId: 'book-1',
        overallRating: 5,
        cleanlinessRating: 5,
        facilityRating: 5,
        serviceRating: 5,
        valueRating: 5,
        comment: 'Perfect!',
      }
      expect(review.comment).toBe('Perfect!')
    })
  })
})
