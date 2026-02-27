import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronLeft, Heart, Share2, Star, MapPin, Users, Check, Anchor, Wifi, Wind, Droplets, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Boat } from '@/types';

interface BoatDetailsProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack: () => void;
  boatId?: string;
}

const boat: Boat = {
  id: '1',
  name: "45' Sea Ray Sundancer",
  location: 'Miami, FL',
  rating: 4.9,
  reviews: 245,
  price: 157,
  priceUnit: 'hour',
  duration: '2-8 hours',
  capacity: 13,
  images: [
    'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    'https://images.unsplash.com/photo-1565016703590-1f5d0139d1a4?w=800&q=80',
  ],
  instantBook: true,
  topOwner: false,
  captain: true,
  description: 'Experience a great day around beautiful Miami on this stunning 45\' Sea Ray Sundancer. Perfect for sunset cruises, bachelorette parties, birthdays, night cruising, sandbar visits, and more. The boat comes fully equipped with premium amenities for an unforgettable experience on the water.',
  amenities: ['Bluetooth Audio', 'Cooler/Ice', 'Bathroom', 'Swim Platform', 'Sun Pad', 'GPS', 'Life Jackets'],
  owner: {
    name: 'Mila',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    responseRate: 98,
  },
};

const amenitiesIcons: Record<string, React.ElementType> = {
  'Bluetooth Audio': Wifi,
  'Cooler/Ice': Droplets,
  'Bathroom': Droplets,
  'Swim Platform': Sun,
  'Sun Pad': Sun,
  'GPS': Wifi,
  'Life Jackets': Wind,
};

export default function BoatDetails({ onNavigate, onBack }: BoatDetailsProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  
  const imageScale = useTransform(scrollY, [0, 200], [1, 1.1]);
  const imageOpacity = useTransform(scrollY, [0, 200], [1, 0.8]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto ios-scroll pb-24">
        {/* Image Gallery */}
        <div className="relative h-[45vh]">
          <motion.div
            style={{ scale: imageScale, opacity: imageOpacity }}
            className="w-full h-full"
          >
            <img
              src={boat.images[currentImage]}
              alt={boat.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

          {/* Top Buttons */}
          <div className="absolute top-0 inset-x-0 p-4 safe-top flex items-center justify-between">
            <motion.button
              onClick={onBack}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </motion.button>
            <div className="flex gap-2">
              <motion.button
                onClick={() => setIsFavorite(!isFavorite)}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'
                  }`}
                />
              </motion.button>
              <motion.button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                <Share2 className="w-5 h-5 text-gray-700" />
              </motion.button>
            </div>
          </div>

          {/* Image Dots */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
            {boat.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentImage ? 'w-6 bg-white' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 -mt-4 relative bg-white rounded-t-3xl">
          {/* Title & Rating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-4">{boat.name}</h1>
              <div className="flex items-center gap-1 bg-[#fbbf24]/10 px-3 py-1.5 rounded-xl">
                <Star className="w-4 h-4 fill-[#fbbf24] text-[#fbbf24]" />
                <span className="font-bold">{boat.rating}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {boat.location}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Up to {boat.capacity}
              </div>
            </div>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mb-6"
          >
            {boat.instantBook && (
              <Badge className="bg-[#00d4ff]/10 text-[#00d4ff] border-0">
                Instant Book
              </Badge>
            )}
            {boat.captain && (
              <Badge className="bg-[#0a0f1c]/10 text-[#0a0f1c] border-0 flex items-center gap-1">
                <Anchor className="w-3 h-3" />
                With Captain
              </Badge>
            )}
          </motion.div>

          {/* Owner Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6"
          >
            <Avatar className="w-14 h-14 border-2 border-white shadow-md">
              <AvatarImage src={boat.owner.avatar} />
              <AvatarFallback>{boat.owner.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Owned by {boat.owner.name}</h3>
              <p className="text-sm text-gray-500">{boat.owner.responseRate}% response rate</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full">
              Contact
            </Button>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">About this boat</h2>
            <p className="text-gray-600 leading-relaxed">{boat.description}</p>
          </motion.div>

          {/* Amenities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {boat.amenities.map((amenity, index) => {
                const Icon = amenitiesIcons[amenity] || Check;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
                  >
                    <Icon className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Reviews Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
              <button className="text-[#00d4ff] text-sm font-medium">
                See all {boat.reviews}
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">John D.</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-[#fbbf24] text-[#fbbf24]" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Amazing experience! The boat was beautiful and Mila was very accommodating. 
                Highly recommend for any occasion!
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#00d4ff]">${boat.price}</span>
              <span className="text-gray-400">/{boat.priceUnit}</span>
            </div>
            <p className="text-sm text-gray-500">{boat.duration}</p>
          </div>
          <Button
            onClick={() => onNavigate('booking', { boatId: boat.id })}
            className="px-8 h-12 bg-[#00d4ff] hover:bg-[#00b8db] text-[#0a0f1c] font-bold rounded-xl transition-all active:scale-95"
          >
            Book Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
