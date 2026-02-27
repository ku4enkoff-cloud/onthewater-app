import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  boatName?: string;
}

const messages: Message[] = [
  {
    id: '1',
    senderName: 'Mila',
    senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    preview: 'Hi! Yes, the boat is available on Saturday. Would you like to book?',
    timestamp: '2m ago',
    unread: true,
    boatName: "45' Sea Ray Sundancer",
  },
  {
    id: '2',
    senderName: 'Alex',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    preview: 'Thanks for your booking! Looking forward to having you on board.',
    timestamp: '1h ago',
    unread: true,
    boatName: "82FT Luxury Yacht",
  },
  {
    id: '3',
    senderName: 'Sarah',
    senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    preview: 'The jet ski can be added for an extra $200. Let me know!',
    timestamp: '3h ago',
    unread: false,
    boatName: '46ft "Pink Lady"',
  },
  {
    id: '4',
    senderName: 'Mike',
    senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
    preview: 'Perfect! See you this weekend. Don\'t forget sunscreen!',
    timestamp: '1d ago',
    unread: false,
    boatName: "50' Carver Yacht",
  },
  {
    id: '5',
    senderName: 'Emma',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
    preview: 'Can we reschedule to next week? Something came up.',
    timestamp: '2d ago',
    unread: false,
    boatName: "65ft Luxury Azimut",
  },
];

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = messages.filter(
    (msg) =>
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-4 safe-top bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-10 h-12 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#00d4ff]"
          />
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto ios-scroll">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-center">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((message, index) => (
              <motion.button
                key={message.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName[0]}</AvatarFallback>
                  </Avatar>
                  {message.unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#00d4ff] rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${message.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {message.senderName}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">{message.timestamp}</span>
                  </div>
                  {message.boatName && (
                    <p className="text-xs text-[#00d4ff] mb-1 truncate">{message.boatName}</p>
                  )}
                  <p className={`text-sm truncate ${message.unread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {message.preview}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
