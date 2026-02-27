export interface Boat {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  priceUnit: string;
  duration: string;
  capacity: number;
  images: string[];
  instantBook: boolean;
  topOwner: boolean;
  captain: boolean;
  description: string;
  amenities: string[];
  owner: {
    name: string;
    avatar: string;
    responseRate: number;
  };
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  boats: string;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  color: string;
}

export interface Booking {
  id: string;
  boatId: string;
  boatName: string;
  boatImage: string;
  date: string;
  time: string;
  duration: number;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
  trips: number;
  reviews: number;
  saved: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

export interface FilterOptions {
  priceRange: [number, number];
  date: string | null;
  capacity: number;
  boatTypes: string[];
  captain: boolean;
  instantBook: boolean;
}

export type ScreenType = 
  | 'onboarding' 
  | 'home' 
  | 'search' 
  | 'boat-details' 
  | 'booking' 
  | 'profile' 
  | 'favorites' 
  | 'messages';
