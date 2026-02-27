import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, Waves, Ship, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    icon: Anchor,
    title: 'Discover Amazing Boats',
    description: 'Explore thousands of boats and yachts available for rent in 600+ locations worldwide.',
    color: '#00d4ff',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80',
  },
  {
    id: 2,
    icon: Waves,
    title: 'Easy Booking',
    description: 'Book your perfect boat in minutes with instant confirmation and secure payments.',
    color: '#34d399',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  },
  {
    id: 3,
    icon: Ship,
    title: 'Unforgettable Experiences',
    description: 'Create lasting memories with family and friends on the water.',
    color: '#f472b6',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  return (
    <div className="h-screen w-full bg-[#0a0f1c] flex flex-col relative overflow-hidden">
      {/* Background Image with Overlay */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-0"
        >
          <img
            src={currentSlideData.image}
            alt={currentSlideData.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={skip}
        className="absolute top-12 right-6 z-20 text-white/70 text-sm font-medium px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm"
      >
        Skip
      </motion.button>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="absolute top-12 left-6 z-20 flex items-center gap-2"
      >
        <div className="w-10 h-10 bg-[#00d4ff] rounded-xl flex items-center justify-center">
          <Anchor className="w-6 h-6 text-[#0a0f1c]" />
        </div>
        <span className="text-xl font-bold text-white">WAVE</span>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-end relative z-10">
        <div className="px-6 pb-8">
          {/* Slide Indicators */}
          <div className="flex gap-2 mb-8">
            {slides.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-[#00d4ff]' : 'w-2 bg-white/30'
                }`}
                animate={{
                  scale: index === currentSlide ? 1 : 0.8,
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <motion.div
            key={`icon-${currentSlide}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: `${currentSlideData.color}20` }}
          >
            <Icon className="w-8 h-8" style={{ color: currentSlideData.color }} />
          </motion.div>

          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-white mb-3">
                {currentSlideData.title}
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                {currentSlideData.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={nextSlide}
              className="w-full h-14 bg-[#00d4ff] hover:bg-[#00b8db] text-[#0a0f1c] font-bold text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
