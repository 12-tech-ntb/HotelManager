/**
 * HOTEL MANAGEMENT SYSTEM - MOCK DATA
 * Standard Relational Schema for Rooms, Bookings, Customers, Vouchers, and Revenue
 * Sẵn sàng kết nối Supabase / PostgreSQL trong tương lai
 */

export const HOTEL_CONFIG = {
  name: "Aurora Luxury Hotel",
  code: "AURORA-HN",
  address: "128 Đường Hoàng Diệu, Ba Đình, Hà Nội",
  phone: "024 3823 8888",
  currency: "VND",
  totalRooms: 16
};

export const ROOM_TYPES = [
  { id: "std", name: "Standard Room", code: "STD", basePrice: 850000 },
  { id: "sup", name: "Superior Room", code: "SUP", basePrice: 1250000 },
  { id: "dlx", name: "Deluxe Suite", code: "DLX", basePrice: 1850000 },
  { id: "ste", name: "Executive Suite", code: "STE", basePrice: 2800000 },
  { id: "prs", name: "Presidential Suite", code: "PRS", basePrice: 5500000 }
];

export const INITIAL_ROOMS = [
  // Tầng 1
  { id: "r101", roomNumber: "101", type: "Standard Room", floor: 1, price: 850000, capacity: 2, status: "occupied", amenities: ["Wifi", "TV", "Điều hòa"] },
  { id: "r102", roomNumber: "102", type: "Standard Room", floor: 1, price: 850000, capacity: 2, status: "available", amenities: ["Wifi", "TV", "Điều hòa"] },
  { id: "r103", roomNumber: "103", type: "Superior Room", floor: 1, price: 1250000, capacity: 2, status: "available", amenities: ["Wifi", "Smart TV", "Bồn tắm", "Minibar"] },
  { id: "r104", roomNumber: "104", type: "Superior Room", floor: 1, price: 1250000, capacity: 2, status: "cleaning", amenities: ["Wifi", "Smart TV", "Bồn tắm", "Minibar"] },

  // Tầng 2
  { id: "r201", roomNumber: "201", type: "Standard Room", floor: 2, price: 850000, capacity: 2, status: "available", amenities: ["Wifi", "TV", "Điều hòa"] },
  { id: "r202", roomNumber: "202", type: "Superior Room", floor: 2, price: 1250000, capacity: 2, status: "occupied", amenities: ["Wifi", "Smart TV", "Bồn tắm", "Minibar"] },
  { id: "r203", roomNumber: "203", type: "Deluxe Suite", floor: 2, price: 1850000, capacity: 3, status: "available", amenities: ["Wifi", "Ban công", "Bồn sục", "Smart TV"] },
  { id: "r204", roomNumber: "204", type: "Deluxe Suite", floor: 2, price: 1850000, capacity: 3, status: "occupied", amenities: ["Wifi", "Ban công", "Bồn sục", "Smart TV"] },

  // Tầng 3
  { id: "r301", roomNumber: "301", type: "Superior Room", floor: 3, price: 1250000, capacity: 2, status: "available", amenities: ["Wifi", "Smart TV", "Bồn tắm"] },
  { id: "r302", roomNumber: "302", type: "Deluxe Suite", floor: 3, price: 1850000, capacity: 3, status: "available", amenities: ["Wifi", "Ban công", "Bồn sục"] },
  { id: "r303", roomNumber: "303", type: "Deluxe Suite", floor: 3, price: 1850000, capacity: 3, status: "maintenance", amenities: ["Wifi", "Ban công", "Bồn sục"] },
  { id: "r304", roomNumber: "304", type: "Executive Suite", floor: 3, price: 2800000, capacity: 4, status: "occupied", amenities: ["View biển", "Phòng khách riêng", "Minibar cao cấp"] },

  // Tầng 4
  { id: "r401", roomNumber: "401", type: "Deluxe Suite", floor: 4, price: 1850000, capacity: 3, status: "available", amenities: ["View thành phố", "Ban công rộng"] },
  { id: "r402", roomNumber: "402", type: "Executive Suite", floor: 4, price: 2800000, capacity: 4, status: "available", amenities: ["View thành phố", "Phòng ăn riêng"] },
  { id: "r403", roomNumber: "403", type: "Executive Suite", floor: 4, price: 2800000, capacity: 4, status: "maintenance", amenities: ["View thành phố", "Phòng ăn riêng"] },
  { id: "r404", roomNumber: "404", type: "Presidential Suite", floor: 4, price: 5500000, capacity: 6, status: "occupied", amenities: ["Penthouse", "Bể bơi riêng", "Quản gia 24/7"] }
];

export const INITIAL_CUSTOMERS = [
  { id: "c001", fullName: "Nguyễn Văn An", phone: "0912 345 678", email: "an.nguyen@gmail.com", idCard: "001200001234", visits: 4, totalSpent: 12450000 },
  { id: "c002", fullName: "Trần Thị Bích", phone: "0988 765 432", email: "bich.tran@yahoo.com", idCard: "001200005678", visits: 2, totalSpent: 4800000 },
  { id: "c003", fullName: "Lê Hoàng Minh", phone: "0903 112 233", email: "minh.le@outlook.com", idCard: "079200009876", visits: 6, totalSpent: 26500000 },
  { id: "c004", fullName: "Phạm Hồng Ngọc", phone: "0977 445 566", email: "ngoc.pham@gmail.com", idCard: "031200003456", visits: 1, totalSpent: 1850000 },
  { id: "c005", fullName: "Vũ Đình Trọng", phone: "0934 889 900", email: "trong.vu@fpt.com.vn", idCard: "040200007890", visits: 3, totalSpent: 8750000 },
  { id: "c006", fullName: "Đặng Thu Thảo", phone: "0918 556 677", email: "thao.dang@gmail.com", idCard: "052200002345", visits: 5, totalSpent: 16800000 },
  { id: "c007", fullName: "Hoàng Gia Huy", phone: "0945 223 344", email: "huy.hoang@gmail.com", idCard: "025200008765", visits: 1, totalSpent: 5500000 }
];

export const INITIAL_BOOKINGS = [
  {
    id: "BK-202611-001",
    customerId: "c001",
    customerName: "Nguyễn Văn An",
    customerPhone: "0912 345 678",
    roomId: "r101",
    roomNumber: "101",
    roomType: "Standard Room",
    checkInDate: "2026-11-21",
    checkOutDate: "2026-11-24",
    totalAmount: 2550000,
    status: "checked_in",
    paymentStatus: "paid",
    createdAt: "2026-11-21 09:30"
  },
  {
    id: "BK-202611-002",
    customerId: "c002",
    customerName: "Trần Thị Bích",
    customerPhone: "0988 765 432",
    roomId: "r202",
    roomNumber: "202",
    roomType: "Superior Room",
    checkInDate: "2026-11-21",
    checkOutDate: "2026-11-23",
    totalAmount: 2500000,
    status: "checked_in",
    paymentStatus: "paid",
    createdAt: "2026-11-21 11:15"
  },
  {
    id: "BK-202611-003",
    customerId: "c003",
    customerName: "Lê Hoàng Minh",
    customerPhone: "0903 112 233",
    roomId: "r204",
    roomNumber: "204",
    roomType: "Deluxe Suite",
    checkInDate: "2026-11-21",
    checkOutDate: "2026-11-25",
    totalAmount: 7400000,
    status: "checked_in",
    paymentStatus: "paid",
    createdAt: "2026-11-21 14:00"
  },
  {
    id: "BK-202611-004",
    customerId: "c004",
    customerName: "Phạm Hồng Ngọc",
    customerPhone: "0977 445 566",
    roomId: "r103",
    roomNumber: "103",
    roomType: "Superior Room",
    checkInDate: "2026-11-22",
    checkOutDate: "2026-11-24",
    totalAmount: 2500000,
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: "2026-11-21 16:40"
  },
  {
    id: "BK-202611-005",
    customerId: "c005",
    customerName: "Vũ Đình Trọng",
    customerPhone: "0934 889 900",
    roomId: "r302",
    roomNumber: "302",
    roomType: "Deluxe Suite",
    checkInDate: "2026-11-23",
    checkOutDate: "2026-11-26",
    totalAmount: 5550000,
    status: "confirmed",
    paymentStatus: "partial",
    createdAt: "2026-11-20 18:20"
  },
  {
    id: "BK-202611-006",
    customerId: "c006",
    customerName: "Đặng Thu Thảo",
    customerPhone: "0918 556 677",
    roomId: "r304",
    roomNumber: "304",
    roomType: "Executive Suite",
    checkInDate: "2026-11-20",
    checkOutDate: "2026-11-23",
    totalAmount: 8400000,
    status: "checked_in",
    paymentStatus: "paid",
    createdAt: "2026-11-20 10:00"
  },
  {
    id: "BK-202611-007",
    customerId: "c007",
    customerName: "Hoàng Gia Huy",
    customerPhone: "0945 223 344",
    roomId: "r404",
    roomNumber: "404",
    roomType: "Presidential Suite",
    checkInDate: "2026-11-21",
    checkOutDate: "2026-11-24",
    totalAmount: 16500000,
    status: "checked_in",
    paymentStatus: "paid",
    createdAt: "2026-11-21 13:20"
  }
];

export const INITIAL_VOUCHERS = [
  { id: "v01", code: "WELCOME10", description: "Giảm 10% cho khách hàng mới", type: "percentage", value: 10, minOrder: 1000000, active: true },
  { id: "v02", code: "LUXURY500", description: "Giảm 500.000₫ cho phòng Suite", type: "fixed", value: 500000, minOrder: 3000000, active: true },
  { id: "v03", code: "WEEKEND15", description: "Ưu đãi cuối tuần giảm 15%", type: "percentage", value: 15, minOrder: 2000000, active: true }
];

export const REVENUE_DATA = {
  currentMonth: 148500000,
  previousMonth: 132000000,
  growthPercentage: 12.5,
  weeklyDays: [
    { day: "Thứ 2", date: "15/11", amount: 16500000 },
    { day: "Thứ 3", date: "16/11", amount: 14200000 },
    { day: "Thứ 4", date: "17/11", amount: 19800000 },
    { day: "Thứ 5", date: "18/11", amount: 18500000 },
    { day: "Thứ 6", date: "19/11", amount: 24600000 },
    { day: "Thứ 7", date: "20/11", amount: 29500000 },
    { day: "Chủ Nhật", date: "21/11", amount: 25400000 }
  ]
};
