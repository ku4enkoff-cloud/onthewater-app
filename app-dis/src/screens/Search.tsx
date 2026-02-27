import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, MapPin, Clock, SlidersHorizontal, ChevronDown, Star, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Boat } from '@/types';

interface SearchProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack: () => void;
}

const recentSearches = ['Miami, FL', 'Yacht rental', 'Fishing boat', 'Party boat'];

const searchResults: Boat[] = [
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
    name: "50' Carver Yacht",
    location: 'Miami Beach, FL',
    rating: 4.8,
    reviews: 189,
    price: 222,
    priceUnit: 'hour',
    duration: '2-8 hours',
    capacity: 12,
    images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80'],
    instantBook: true,
    topOwner: true,
    captain: true,
    description: '',
    amenities: [],
    owner: { name: '', avatar: '', responseRate: 0 },
  },
  {
    id: '3',
    name: "65ft Luxury Azimut",
    location: 'Fort Lauderdale, FL',
    rating: 5.0,
    reviews: 87,
    price: 350,
    priceUnit: 'hour',
    duration: '4-8 hours',
    capacity: 15,
    images: ['https://images.unsplash.com/photo-1565016703590-1f5d0139d1a4?w=600&q=80'],
    instantBook: false,
    topOwner: true,
    captain: true,
    description: '',
    amenities: [],
    owner: { name: '', avatar: '', responseRate: 0 },
  },
];

export default function Search({ onNavigate, onBack }: SearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 safe-top border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search boats, locations..."
              className="pl-10 pr-10 h-12 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#00d4ff]"
              autoFocus
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto ios-scroll">
        {!hasSearched ? (
          <div className="p-4">
            {/* Recent Searches */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      setHasSearched(true);
                    }}
                    className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 active:bg-gray-200 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Popular Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Popular Filters</h3>
              <div className="space-y-2">
                {['Under $200/hour', 'With Captain', 'Instant Book', '4+ Hours'].map((filter, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
                  >
                    <span className="text-gray-700">{filter}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div>
            {/* Results Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <span className="text-sm text-gray-500">{searchResults.length} results</span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium active:bg-gray-200 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-gray-50 border-b border-gray-100"
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">$0-100</Button>
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">$100-300</Button>
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">$300+</Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Duration</label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">2-4 hrs</Button>
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">4-8 hrs</Button>
                        <Button variant="outline" size="sm" className="flex-1 rounded-full">8+ hrs</Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results List */}
            <div className="p-4 space-y-4">
              {searchResults.map((boat, index) => (
                <motion.div
                  key={boat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onNavigate('boat-details', { boatId: boat.id })}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
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
                        <span className="absolute top-2 left-2 px-2 py-1 bg-[#00d4ff] text-[#0a0f1c] text-[10px] font-bold rounded-md">
                          Instant
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{boat.name}</h3>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
