import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, Star, Clock, Users, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Boat } from '@/types';

interface FavoritesProps {
  onNavigate: (screen: string, params?: any) => void;
}

const initialFavorites: Boat[] = [
  {
    id: '1',
    name: "45' Sea Ray Sundancer",
    location: 'Miami, FL',
    rating: 4.9,
    reviews: 245,
    price: 157,
    priceUnit: 'hour',
    duration: '2-8 hours',
    capacity: 13,
    images: ['https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80'],
    instantBook: true,
    topOwner: false,
    captain: true,
    description: '',
    amenities: [],
    owner: { name: '', avatar: '', responseRate: 0 },
  },
  {
    id: '2',
    name: "82FT Luxury Yacht",
    location: 'Miami Beach, FL',
    rating: 5.0,
    reviews: 66,
    price: 381,
    priceUnit: 'hour',
    duration: '3-8 hours',
    capacity: 13,
    images: ['https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=600&q=80'],
    instantBook: true,
    topOwner: true,
    captain: true,
    description: '',
    amenities: [],
    owner: { name: '', avatar: '', responseRate: 0 },
  },
  {
    id: '3',
    name: '46ft "Pink Lady"',
    location: 'Miami, FL',
    rating: 4.8,
    reviews: 128,
    price: 227,
    priceUnit: 'hour',
    duration: '2-8 hours',
    capacity: 12,
    images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80'],
    instantBook: true,
    topOwner: false,
    captain: true,
    description: '',
    amenities: [],
    owner: { name: '', avatar: '', responseRate: 0 },
  },
];

export default function Favorites({ onNavigate }: FavoritesProps) {
  const [favorites, setFavorites] = useState<Boat[]>(initialFavorites);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const removeFavorite = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      setFavorites((prev) => prev.filter((boat) => boat.id !== id));
      setRemovingId(null);
    }, 300);
  };

  if (favorites.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6"
        >
          <Heart className="w-12 h-12 text-gray-400" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-gray-900 mb-2"
        >
          No Saved Boats
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-center mb-8"
        >
          Start exploring and save your favorite boats for quick access
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => onNavigate('home')}
          className="px-8 py-3 bg-[#00d4ff] text-[#0a0f1c] font-bold rounded-xl"
        >
          Explore Boats
        </motion.button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 py-4 safe-top bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Saved Boats</h1>
          <span className="text-sm text-gray-500">{favorites.length} items</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto ios-scroll p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {favorites.map((boat, index) => (
              <motion.div
                key={boat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: removingId === boat.id ? 0 : 1, 
                  x: removingId === boat.id ? -100 : 0 
                }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onNavigate('boat-details', { boatId: boat.id })}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0 relative">
                    <img
                      src={boat.images[0]}
                      alt={boat.name}
                      className="w-full h-full object-cover"
                    />
                    {boat.instantBook && (
                      <Badge className="absolute top-2 left-2 bg-[#00d4ff] text-[#0a0f1c] text-[10px]">
                        Instant
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-1 pr-2">{boat.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(boat.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 active:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        {boat.location}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {boat.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {boat.capacity}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#fbbf24] text-[#fbbf24]" />
                        <span className="text-xs font-semibold">{boat.rating}</span>
                        <span className="text-xs text-gray-400">({boat.reviews})</span>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-[#00d4ff]">${boat.price}</span>
                        <span className="text-xs text-gray-400">/hr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
