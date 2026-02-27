import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, Users, ChevronRight, Zap, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Boat, Destination, Category } from '@/types';

interface HomeProps {
  onNavigate: (screen: string, params?: any) => void;
}

const categories: Category[] = [
  { id: '1', name: 'Yachts', description: 'Luxury vessels', icon: 'ship', image: '', color: '#fbbf24' },
  { id: '2', name: 'Sailboats', description: 'Classic sailing', icon: 'sail', image: '', color: '#34d399' },
  { id: '3', name: 'Fishing', description: 'Angler boats', icon: 'fish', image: '', color: '#60a5fa' },
  { id: '4', name: 'Party', description: 'Group fun', icon: 'party', image: '', color: '#f472b6' },
  { id: '5', name: 'Pontoon', description: 'Relaxing cruises', icon: 'anchor', image: '', color: '#a78bfa' },
];

const destinations: Destination[] = [
  { id: '1', name: 'Miami', state: 'FL', boats: '2,400+', image: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=400&q=80' },
  { id: '2', name: 'Chicago', state: 'IL', boats: '890+', image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&q=80' },
  { id: '3', name: 'Tampa', state: 'FL', boats: '1,200+', image: 'https://images.unsplash.com/photo-1565016703590-1f5d0139d1a4?w=400&q=80' },
  { id: '4', name: 'NYC', state: 'NY', boats: '1,500+', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=80' },
];

const featuredBoats: Boat[] = [
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
    description: 'Beautiful Sea Ray perfect for any occasion',
    amenities: ['Bluetooth', 'Cooler', 'Bathroom'],
    owner: { name: 'Mila', avatar: '', responseRate: 98 },
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
    description: 'Premium yacht with all amenities',
    amenities: ['Jacuzzi', 'Bar', 'Sound System'],
    owner: { name: 'Alex', avatar: '', responseRate: 99 },
  },
];

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="h-full overflow-y-auto ios-scroll pb-24">
      {/* Hero Section */}
      <div className="relative h-[45vh] min-h-[350px]">
        <img
          src="https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80"
          alt="Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1c]/60 via-transparent to-[#0a0f1c]/90" />
        
        {/* Header Content */}
        <div className="absolute inset-x-0 top-0 p-4 safe-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00d4ff] rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#0a0f1c]" />
              </div>
              <span className="text-lg font-bold text-white">WAVE</span>
            </div>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Hero Text */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Find Your Perfect Boat
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80"
          >
            600+ locations worldwide
          </motion.p>
        </div>
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 -mt-6 relative z-10"
      >
        <div className="bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#00d4ff]" />
          <Input
            placeholder="Where do you want to boat?"
            className="border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 p-0"
            onClick={() => onNavigate('search')}
            readOnly
          />
        </div>
      </motion.div>

      {/* Categories */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Categories</h2>
          <button className="text-[#00d4ff] text-sm font-medium flex items-center gap-1">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="flex-shrink-0 px-5 py-3 rounded-full bg-white shadow-sm border border-gray-100 flex items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Featured Destinations */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Popular Destinations</h2>
          <button className="text-[#00d4ff] text-sm font-medium flex items-center gap-1">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          {destinations.map((dest, index) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex-shrink-0 w-40 relative rounded-2xl overflow-hidden card-lift"
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-bold">{dest.name}</h3>
                <p className="text-white/70 text-xs">{dest.boats} boats</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Boats */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Featured Boats</h2>
          <button className="text-[#00d4ff] text-sm font-medium flex items-center gap-1">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          {featuredBoats.map((boat, index) => (
            <motion.div
              key={boat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => onNavigate('boat-details', { boatId: boat.id })}
              className="bg-white rounded-2xl shadow-sm overflow-hidden card-lift"
            >
              {/* Image */}
              <div className="relative h-48">
                <img
                  src={boat.images[0]}
                  alt={boat.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {boat.instantBook && (
                    <Badge className="bg-[#00d4ff] text-[#0a0f1c] text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Instant
                    </Badge>
                  )}
                  {boat.topOwner && (
                    <Badge className="bg-[#fbbf24] text-[#0a0f1c] text-xs">
                      Top Owner
                    </Badge>
                  )}
                </div>
                <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{boat.name}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <MapPin className="w-3 h-3" />
                      {boat.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#fbbf24]/10 px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 fill-[#fbbf24] text-[#fbbf24]" />
                    <span className="text-sm font-semibold">{boat.rating}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {boat.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {boat.capacity}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-xl font-bold text-[#00d4ff]">${boat.price}</span>
                    <span className="text-gray-400 text-sm">/{boat.priceUnit}</span>
                  </div>
                  <button className="px-4 py-2 bg-[#0a0f1c] text-white text-sm font-medium rounded-xl active:scale-95 transition-transform">
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Spacer for bottom nav */}
      <div className="h-8" />
    </div>
  );
}
