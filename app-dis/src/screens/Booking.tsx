import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Calendar, Clock, Users, Check, CreditCard, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BookingProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack: () => void;
  boatId?: string;
}

const timeSlots = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

const durations = [
  { hours: 2, price: 314 },
  { hours: 3, price: 471 },
  { hours: 4, price: 628 },
  { hours: 6, price: 942 },
  { hours: 8, price: 1256 },
];

const addOns = [
  { id: 'captain', name: 'Professional Captain', price: 50, per: 'hour' },
  { id: 'fuel', name: 'Fuel Package', price: 120, per: 'trip' },
  { id: 'jetski', name: 'Jet Ski Rental', price: 200, per: 'trip' },
  { id: 'catering', name: 'Catering Service', price: 150, per: 'trip' },
];

export default function Booking({ onNavigate, onBack }: BookingProps) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(durations[1]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [guests, setGuests] = useState(4);
  const [isComplete, setIsComplete] = useState(false);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    let total = selectedDuration.price;
    selectedAddOns.forEach((addonId) => {
      const addon = addOns.find((a) => a.id === addonId);
      if (addon) {
        total += addon.per === 'hour' ? addon.price * selectedDuration.hours : addon.price;
      }
    });
    return total;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date.toISOString().split('T')[0],
    };
  });

  if (isComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <Check className="w-12 h-12 text-green-500" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Booking Confirmed!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-center mb-8"
        >
          Your reservation has been confirmed. Check your email for details.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full p-4 bg-gray-50 rounded-2xl mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <img
              src="https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=200&q=80"
              alt="Boat"
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-bold text-gray-900">45' Sea Ray Sundancer</h3>
              <p className="text-sm text-gray-500">Miami, FL</p>
              <p className="text-sm text-[#00d4ff] font-semibold">${calculateTotal()} total</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {selectedDate}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {selectedTime}
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full space-y-3"
        >
          <Button
            onClick={() => onNavigate('home')}
            className="w-full h-14 bg-[#00d4ff] hover:bg-[#00b8db] text-[#0a0f1c] font-bold rounded-xl"
          >
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('profile')}
            className="w-full h-14 rounded-xl"
          >
            View My Bookings
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 safe-top border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Book Your Trip</h1>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            className="h-full bg-[#00d4ff] rounded-full"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto ios-scroll p-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Date Selection */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Select Date</h2>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                  {dates.map((date) => (
                    <button
                      key={date.fullDate}
                      onClick={() => setSelectedDate(date.fullDate)}
                      className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        selectedDate === date.fullDate
                          ? 'bg-[#00d4ff] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-xs uppercase">{date.day}</span>
                      <span className="text-xl font-bold">{date.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Select Time</h2>
                  <div className="flex flex-wrap gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedTime === time
                            ? 'bg-[#00d4ff] text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Duration */}
              {selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Duration</h2>
                  <div className="space-y-2">
                    {durations.map((dur) => (
                      <button
                        key={dur.hours}
                        onClick={() => setSelectedDuration(dur)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                          selectedDuration.hours === dur.hours
                            ? 'bg-[#00d4ff]/10 border-2 border-[#00d4ff]'
                            : 'bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{dur.hours} hours</span>
                        <span className="font-bold text-[#00d4ff]">${dur.price}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Guests */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Number of Guests</h2>
                <div className="flex items-center justify-between p-4 bg-gray-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">Guests</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{guests}</span>
                    <button
                      onClick={() => setGuests(Math.min(13, guests + 1))}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Add-ons */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Add-ons</h2>
                <div className="space-y-3">
                  {addOns.map((addon) => (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                        selectedAddOns.includes(addon.id)
                          ? 'bg-[#00d4ff]/10 border-2 border-[#00d4ff]'
                          : 'bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{addon.name}</p>
                        <p className="text-sm text-gray-500">
                          ${addon.price}/{addon.per}
                        </p>
                      </div>
                      {selectedAddOns.includes(addon.id) && (
                        <Check className="w-5 h-5 text-[#00d4ff]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Contact Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Full Name</label>
                    <Input placeholder="John Doe" className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Email</label>
                    <Input type="email" placeholder="john@example.com" className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Phone</label>
                    <Input type="tel" placeholder="+1 (555) 000-0000" className="h-12 rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  We'll send booking confirmation and captain contact details to this email.
                </p>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Payment */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Payment Method</h2>
                <div className="p-4 bg-gray-100 rounded-2xl flex items-center gap-3">
                  <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Add Payment Method</p>
                    <p className="text-sm text-gray-500">Credit or debit card</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </div>

              {/* Price Breakdown */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Price Breakdown</h2>
                <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Boat rental ({selectedDuration.hours} hrs)</span>
                    <span>${selectedDuration.price}</span>
                  </div>
                  {selectedAddOns.map((addonId) => {
                    const addon = addOns.find((a) => a.id === addonId);
                    if (!addon) return null;
                    const price = addon.per === 'hour' ? addon.price * selectedDuration.hours : addon.price;
                    return (
                      <div key={addonId} className="flex justify-between text-gray-600">
                        <span>{addon.name}</span>
                        <span>${price}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-gray-600">
                    <span>Service fee</span>
                    <span>$45</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[#00d4ff]">${calculateTotal() + 45}</span>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl">
                <Shield className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700">
                  Your payment is secured with 256-bit SSL encryption
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Button */}
      <div className="p-4 safe-bottom border-t border-gray-100">
        <Button
          onClick={handleNext}
          disabled={step === 1 && (!selectedDate || !selectedTime)}
          className="w-full h-14 bg-[#00d4ff] hover:bg-[#00b8db] text-[#0a0f1c] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 4 ? 'Confirm Booking' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
