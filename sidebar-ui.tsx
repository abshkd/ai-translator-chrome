import React, { useState } from 'react';
import { MessageSquare, Search, Globe, FileText, AlertTriangle } from 'lucide-react';

const Sidebar = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, { type: 'user', content: input }]);
    setInput('');
    setIsProcessing(true);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: 'Here is how I can help with that...' 
      }]);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen w-80 bg-white border-l border-gray-200 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <div className="flex gap-2 mt-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Globe className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg ${
              msg.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can I help?"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
          />
          <button 
            type="submit"
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
        {/* Privacy Notice */}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <AlertTriangle className="w-4 h-4" />
          <span>Sensitive info is not collected</span>
        </div>
      </form>
    </div>
  );
};

export default Sidebar;